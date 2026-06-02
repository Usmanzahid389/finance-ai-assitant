import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { categorizeTransaction } from "@/lib/ai/categorize"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("image") as File | null
  if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString("base64")
  const mimeType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp"

  // Use Sonnet for vision (better OCR accuracy)
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
          {
            type: "text",
            text: `Extract the following from this receipt image and respond ONLY with valid JSON:
{
  "merchant": "store/restaurant name",
  "date": "YYYY-MM-DD or null",
  "total": 0.00,
  "currency": "USD",
  "items": [{"name": "item", "price": 0.00}],
  "tax": 0.00,
  "tip": 0.00,
  "confidence": "high|medium|low"
}

If the image is blurry, rotated, or partial — do your best and set confidence accordingly. Never return null for total; estimate if unclear.`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  let extracted: {
    merchant: string; date: string | null; total: number; currency: string;
    items: Array<{ name: string; price: number }>; tax: number; tip: number; confidence: string
  }
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    extracted = JSON.parse(jsonMatch?.[0] ?? text)
  } catch {
    return NextResponse.json({ error: "Could not parse receipt", raw: text }, { status: 422 })
  }

  // Optionally store receipt image in Supabase Storage
  let receiptUrl: string | null = null
  try {
    const { data: uploadData } = await supabase.storage
      .from("receipts")
      .upload(`${user.id}/${Date.now()}-${file.name}`, bytes, {
        contentType: mimeType,
        upsert: false,
      })
    if (uploadData) {
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(uploadData.path)
      receiptUrl = urlData.publicUrl
    }
  } catch {}

  // Store transaction if we have enough data
  if (extracted.total && extracted.total > 0) {
    const { category } = categorizeTransaction(extracted.merchant || "receipt")
    const date = extracted.date ?? new Date().toISOString().slice(0, 10)

    await supabase.from("transactions").insert({
      user_id: user.id,
      date,
      description: extracted.merchant || "Receipt",
      amount: extracted.total,
      category,
      merchant: extracted.merchant,
      currency: extracted.currency || "USD",
      is_income: false,
      source: "receipt",
      receipt_url: receiptUrl,
    })

    // Update monthly summary
    const [year, month] = date.split("-").map(Number)
    await supabase.rpc("upsert_monthly_summary", { p_user_id: user.id, p_year: year, p_month: month })
  }

  return NextResponse.json({ ...extracted, stored: true, receipt_url: receiptUrl })
}
