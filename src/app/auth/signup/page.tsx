"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import {
  TrendingUp, Mail, Lock, User, ArrowRight, ArrowLeft,
  Loader2, Globe
} from "lucide-react"

const POPULAR_CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "PKR", label: "Pakistani Rupee", symbol: "₨" },
  { code: "AED", label: "UAE Dirham", symbol: "AED" },
]

const inputClass = `
  w-full h-12 pl-11 pr-4 rounded-xl text-sm text-white placeholder:text-slate-600
  outline-none transition-all
`
const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
}

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<"details" | "currency">("details")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function focusBorder(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)"
  }
  function blurBorder(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
  }

  async function handleSignup() {
    setLoading(true)
    setError("")
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name, currency },
      },
    })
    if (error) { setError(error.message); setLoading(false); setStep("details"); return }
    if (data.user) {
      await supabase.from("user_context").upsert(
        { user_id: data.user.id, key: "currency", value: currency, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" }
      )
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#0a0f1e", fontFamily: "var(--font-geist-sans)" }}>

      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[100px] translate-x-1/4 translate-y-1/4" />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 relative"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-xl font-semibold text-white tracking-tight">FinanceAI</span>
        </motion.div>

        <div className="relative space-y-6">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h1 className="text-5xl font-bold text-white leading-tight mb-4">
              Take control of<br />
              <span style={{
                background: "linear-gradient(135deg, #10b981, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                your finances.
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              Join thousands who use AI to understand where their money goes — and how to keep more of it.
            </p>
          </motion.div>

          {/* Floating mock chat card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl p-5 max-w-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-300" style={{ background: "rgba(255,255,255,0.06)" }}>
                How much did I spend on dining last month?
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-200" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.12)" }}>
                You spent <span className="text-emerald-400 font-semibold">$284.50</span> on dining in January — that's <span className="text-amber-400 font-medium">18% more</span> than December.
              </div>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-slate-600 text-xs relative"
        >
          Built with Claude AI · Secured by Supabase
        </motion.p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-semibold text-white">FinanceAI</span>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-3 mb-8">
            {["details", "currency"].map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  step === s ? "text-emerald-400" :
                  (i === 0 && step === "currency") ? "text-slate-500" : "text-slate-600"
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s ? "bg-emerald-500 text-slate-950" :
                    (i === 0 && step === "currency") ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-slate-800 text-slate-500"
                  }`}>
                    {i === 0 && step === "currency" ? "✓" : i + 1}
                  </div>
                  <span className="hidden sm:block">{s === "details" ? "Your details" : "Currency"}</span>
                </div>
                {i === 0 && <div className="w-8 h-px bg-slate-800" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-7">
                  <h2 className="text-3xl font-bold text-white mb-2">Create account</h2>
                  <p className="text-slate-400">Your personal finance AI awaits</p>
                </div>

                <form onSubmit={e => { e.preventDefault(); setStep("currency") }} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Full name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                        required className={inputClass} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                        required className={inputClass} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)}
                        required minLength={6} className={inputClass} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
                    </div>
                  </div>

                  <button type="submit"
                    className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-2"
                    style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                  >
                    <span className="text-white">Continue</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                </form>
              </motion.div>
            )}

            {step === "currency" && (
              <motion.div
                key="currency"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-7">
                  <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Globe className="w-7 h-7 text-emerald-400" />
                    Your currency
                  </h2>
                  <p className="text-slate-400">All amounts will display in this currency. You can change it later.</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-6">
                  {POPULAR_CURRENCIES.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setCurrency(c.code)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                      style={{
                        background: currency === c.code ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.03)",
                        border: currency === c.code ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <span className="text-base w-6 text-center shrink-0" style={{ color: "#94a3b8" }}>{c.symbol}</span>
                      <div>
                        <div className={`text-sm font-medium ${currency === c.code ? "text-emerald-400" : "text-slate-300"}`}>{c.code}</div>
                        <div className="text-xs text-slate-500">{c.label}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("details")}
                    className="h-12 px-5 rounded-xl text-sm font-medium text-slate-400 transition-all hover:text-slate-200 flex items-center gap-2"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSignup}
                    disabled={loading}
                    className="flex-1 h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                  >
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin text-white" />
                      : <><span className="text-white">Create account</span><ArrowRight className="w-4 h-4 text-white" /></>
                    }
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-slate-500 mt-8">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
