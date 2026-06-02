"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Paperclip, X, Loader2, TrendingUp, Zap, RefreshCw, Target, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MessageBubble } from "@/components/chat/message-bubble"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  imageUrl?: string
  toolsUsed?: string[]
}

const SUGGESTIONS = [
  { icon: TrendingUp, text: "How much did I spend last month?" },
  { icon: Search, text: "What is my biggest expense category?" },
  { icon: RefreshCw, text: "Show me my recurring subscriptions" },
  { icon: Target, text: "Am I within my budgets this month?" },
  { icon: Zap, text: "Summarize my finances" },
]

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeTools, setActiveTools] = useState<string[]>([])
  const [attachment, setAttachment] = useState<{ file: File; preview: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported for receipts")
      return
    }
    const preview = URL.createObjectURL(file)
    setAttachment({ file, preview })
  }

  const sendMessage = useCallback(async (text?: string) => {
    const content = text ?? input.trim()
    if (!content && !attachment) return
    if (isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content || "Here's my receipt:",
      imageUrl: attachment?.preview,
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsStreaming(true)
    setActiveTools([])

    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }])

    try {
      let imageBase64: string | undefined
      let imageMime: string | undefined

      if (attachment) {
        const bytes = await attachment.file.arrayBuffer()
        imageBase64 = Buffer.from(bytes).toString("base64")
        imageMime = attachment.file.type
        setAttachment(null)
        URL.revokeObjectURL(userMessage.imageUrl!)
      }

      const history = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          imageBase64,
          imageMime,
        }),
      })

      if (!res.ok) throw new Error("Chat request failed")

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === "text" || event.type === "partial") {
              fullText = event.type === "text" ? event.text : fullText + event.text
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m)
              )
            } else if (event.type === "tool_call") {
              setActiveTools(event.tools)
            } else if (event.type === "done") {
              setActiveTools([])
            } else if (event.type === "error") {
              toast.error(event.text)
            }
          } catch {}
        }
      }

      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, toolsUsed: activeTools } : m)
      )
    } catch (err) {
      toast.error("Failed to get response. Please try again.")
      setMessages(prev => prev.filter(m => m.id !== assistantId))
    } finally {
      setIsStreaming(false)
      setActiveTools([])
      inputRef.current?.focus()
    }
  }, [input, attachment, isStreaming, messages, activeTools])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <AnimatePresence mode="popLayout">
            {isEmpty && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center pt-12 pb-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold text-slate-100 mb-1">What would you like to know?</h2>
                <p className="text-sm text-slate-500 mb-8">Ask anything about your finances</p>

                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map(({ icon: Icon, text }) => (
                    <button
                      key={text}
                      onClick={() => sendMessage(text)}
                      className="flex items-center gap-2 glass glass-hover rounded-full px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-all"
                    >
                      <Icon className="w-3.5 h-3.5 text-emerald-400" />
                      {text}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming && msg.id === messages[messages.length - 1]?.id && msg.role === "assistant"} />
            ))}
          </AnimatePresence>

          {/* Tool indicator */}
          <AnimatePresence>
            {activeTools.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-xs text-slate-500"
              >
                <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                <span>
                  {activeTools.map(t => TOOL_LABELS[t] ?? t).join(", ")}…
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4">
        <div className="max-w-2xl mx-auto">
          {/* Attachment preview */}
          <AnimatePresence>
            {attachment && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2"
              >
                <div className="flex items-center gap-2 glass rounded-lg px-3 py-2">
                  <img src={attachment.preview} alt="Receipt" className="w-8 h-8 rounded object-cover" />
                  <span className="text-xs text-slate-300 flex-1 truncate">{attachment.file.name}</span>
                  <button onClick={() => { setAttachment(null) }} className="text-slate-500 hover:text-slate-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={cn("glass rounded-2xl input-glow transition-all", isStreaming && "opacity-80")}>
            <div className="flex items-end gap-2 p-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances…"
                disabled={isStreaming}
                rows={1}
                className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none min-h-[24px] max-h-[120px] leading-6"
                style={{ height: "24px" }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = "24px"
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
                }}
              />
              <div className="flex items-center gap-1 shrink-0">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
                  title="Upload receipt"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <Button
                  size="icon"
                  onClick={() => sendMessage()}
                  disabled={isStreaming || (!input.trim() && !attachment)}
                  className="w-8 h-8 rounded-xl"
                >
                  {isStreaming
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />
                  }
                </Button>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-slate-700 mt-2">
            AI can make mistakes — always verify financial decisions
          </p>
        </div>
      </div>
    </div>
  )
}

const TOOL_LABELS: Record<string, string> = {
  query_transactions: "Querying transactions",
  get_monthly_summaries: "Loading monthly summaries",
  get_budget_status: "Checking budgets",
  get_recurring_charges: "Finding subscriptions",
  get_user_context: "Loading your preferences",
  save_user_context: "Saving preference",
  web_search: "Searching the web",
  set_budget: "Saving budget",
  flag_anomaly: "Analyzing patterns",
}
