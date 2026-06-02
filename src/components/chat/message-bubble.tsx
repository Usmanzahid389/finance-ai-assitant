"use client"

import { motion } from "framer-motion"
import { TrendingUp, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  imageUrl?: string
  toolsUsed?: string[]
}

interface Props {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        isUser
          ? "bg-slate-200 border border-slate-300 dark:bg-slate-700 dark:border-slate-600"
          : "bg-emerald-500/10 border border-emerald-500/20"
      )}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
          : <TrendingUp className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
        }
      </div>

      {/* Bubble */}
      <div className={cn("max-w-[80%] space-y-2", isUser ? "items-end" : "items-start")}>
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Receipt"
            className="max-w-48 rounded-xl border border-slate-200 dark:border-slate-700 object-cover"
          />
        )}

        {(message.content || isStreaming) && (
          <div className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-7",
            isUser
              ? "bg-emerald-500/10 border border-emerald-500/15 text-slate-700 dark:text-slate-200 rounded-tr-md"
              : "glass border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 rounded-tl-md prose-finance"
          )}>
            {message.content ? (
              <MarkdownContent content={message.content} />
            ) : isStreaming ? (
              <span className="streaming-cursor">&nbsp;</span>
            ) : null}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown-to-JSX for finance responses
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="text-base font-semibold text-slate-100 mt-3 mb-1">{line.slice(3)}</h3>)
    } else if (line.startsWith("# ")) {
      elements.push(<h2 key={i} className="text-lg font-semibold text-slate-100 mt-2 mb-1">{line.slice(2)}</h2>)
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-2 items-start">
          <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(<p key={i}>{renderInline(line)}</p>)
    }
    i++
  }

  return <div className="space-y-0.5">{elements}</div>
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\$[\d,]+\.?\d*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>
    }
    if (/^\$[\d,]+\.?\d*$/.test(part)) {
      return <span key={i} className="text-emerald-600 dark:text-emerald-400 font-medium">{part}</span>
    }
    return part
  })
}
