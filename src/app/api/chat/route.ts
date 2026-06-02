import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { FINANCE_TOOLS } from "@/lib/ai/tools"
import { executeToolCall } from "@/lib/ai/tool-executor"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `You are FinanceAI, a personal finance assistant. You have access to the user's transaction history, budgets, and financial data via tools.

Key behaviours:
- For simple spending questions: use query_transactions or get_monthly_summaries (prefer summaries for performance).
- For budget questions: use get_budget_status.
- For subscriptions/recurring: use get_recurring_charges.
- For unknown merchants: use web_search.
- Always call get_user_context at the start to personalise responses.
- When a user states a preference or fact about themselves, call save_user_context.
- For image uploads (receipts): extract merchant, amount, date, items and confirm recording.
- Be concise and human. Use numbers. Don't waffle.
- When you cannot answer from available data, say so directly.
- Format currency as $X.XX. Use bold for key numbers in your response.
- If asked to compare months, use get_monthly_summaries — never raw transactions for historical analysis.
- Proactively surface anomalies when you notice unusual patterns during analysis.
Today's date: ${new Date().toISOString().slice(0, 10)}`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })
  const userId = user.id

  const { messages, imageBase64, imageMime } = await req.json()

  // Build message history for Claude
  const claudeMessages: Anthropic.MessageParam[] = messages.map(
    (m: { role: string; content: string }) => {
      if (m.role === "user" && imageBase64 && m === messages[messages.length - 1]) {
        return {
          role: "user" as const,
          content: [
            { type: "image" as const, source: { type: "base64" as const, media_type: imageMime || "image/jpeg", data: imageBase64 } },
            { type: "text" as const, text: m.content || "Please read this receipt and extract the details." },
          ],
        }
      }
      return { role: m.role as "user" | "assistant", content: m.content }
    }
  )

  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  async function run() {
    try {
      let currentMessages = [...claudeMessages]
      let iterations = 0
      const MAX_ITERATIONS = 6

      while (iterations < MAX_ITERATIONS) {
        iterations++

        // Use haiku for simple queries (detected by message length/complexity), sonnet for complex
        const isComplex = imageBase64 ||
          currentMessages.some(m =>
            typeof m.content === "string" && m.content.length > 200
          ) ||
          iterations > 1

        const model = isComplex
          ? "claude-haiku-4-5-20251001"
          : "claude-haiku-4-5-20251001"

        const response = await anthropic.messages.create({
          model,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: FINANCE_TOOLS,
          messages: currentMessages,
          stream: false,
        })

        if (response.stop_reason === "end_turn") {
          const text = response.content
            .filter(b => b.type === "text")
            .map(b => (b as Anthropic.TextBlock).text)
            .join("")
          await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`))
          break
        }

        if (response.stop_reason === "tool_use") {
          const toolUses = response.content.filter(b => b.type === "tool_use") as Anthropic.ToolUseBlock[]
          const textBlocks = response.content.filter(b => b.type === "text") as Anthropic.TextBlock[]

          if (textBlocks.length) {
            await writer.write(encoder.encode(
              `data: ${JSON.stringify({ type: "partial", text: textBlocks.map(b => b.text).join("") })}\n\n`
            ))
          }

          // Send tool-use signal to client for UI indication
          await writer.write(encoder.encode(
            `data: ${JSON.stringify({ type: "tool_call", tools: toolUses.map(t => t.name) })}\n\n`
          ))

          // Execute all tool calls in parallel
          const toolResults = await Promise.all(
            toolUses.map(async (toolUse) => {
              const result = await executeToolCall(
                toolUse.name,
                toolUse.input as Record<string, unknown>,
                supabase,
                userId
              )
              return {
                type: "tool_result" as const,
                tool_use_id: toolUse.id,
                content: JSON.stringify(result),
              }
            })
          )

          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: response.content },
            { role: "user" as const, content: toolResults },
          ]
          continue
        }

        break
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong"
      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "error", text: msg })}\n\n`))
    } finally {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
      await writer.close()
    }
  }

  run()

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
