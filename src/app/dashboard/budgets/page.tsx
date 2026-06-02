"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Target, Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { toast } from "sonner"

interface Budget {
  id: string
  category: string
  limit_amount: number
  period: string
  spent?: number
  percent?: number
}

const COMMON_CATEGORIES = [
  "Groceries", "Dining", "Transport", "Shopping", "Entertainment",
  "Healthcare", "Utilities", "Fitness", "Subscriptions", "Education", "Travel",
]

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState("")
  const [limit, setLimit] = useState("")
  const [period, setPeriod] = useState("monthly")
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const formatCurrency = useFormatCurrency()

  useEffect(() => { loadBudgets() }, [])

  async function loadBudgets() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`
    const endOfMonth = `${year}-${String(month).padStart(2, "0")}-31`

    const [{ data: bs }, { data: spending }] = await Promise.all([
      supabase.from("budgets").select("*").eq("user_id", user.id),
      supabase.from("transactions")
        .select("category, amount")
        .eq("user_id", user.id)
        .eq("is_income", false)
        .gte("date", startOfMonth)
        .lte("date", endOfMonth),
    ])

    const spentMap: Record<string, number> = {}
    for (const t of spending ?? []) {
      spentMap[t.category] = (spentMap[t.category] ?? 0) + Number(t.amount)
    }

    setBudgets((bs ?? []).map(b => ({
      ...b,
      spent: spentMap[b.category] ?? 0,
      percent: Math.round(((spentMap[b.category] ?? 0) / Number(b.limit_amount)) * 100),
    })))
    setLoading(false)
  }

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault()
    if (!category || !limit) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from("budgets").upsert(
      { user_id: user.id, category, limit_amount: parseFloat(limit), period },
      { onConflict: "user_id,category,period" }
    )

    if (error) { toast.error("Failed to save budget"); setSaving(false); return }
    toast.success(`Budget set for ${category}`)
    setShowForm(false)
    setCategory("")
    setLimit("")
    setSaving(false)
    loadBudgets()
  }

  async function deleteBudget(id: string) {
    await supabase.from("budgets").delete().eq("id", id)
    toast.success("Budget removed")
    setBudgets(prev => prev.filter(b => b.id !== id))
  }

  const currentPeriod = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">Budgets</h1>
            <p className="text-sm text-slate-500">{currentPeriod}</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-3.5 h-3.5" />Add budget
          </Button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card>
                <CardHeader><CardTitle>New budget</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={saveBudget} className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block">Category</label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white text-slate-700 px-3 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Select category…</option>
                        {COMMON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block">Monthly limit</label>
                      <Input type="number" placeholder="500" value={limit} onChange={e => setLimit(e.target.value)} min="1" step="1" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving} className="flex-1">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save budget"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {budgets.length === 0 && !showForm && (
          <div className="glass rounded-2xl p-10 text-center border border-dashed border-slate-200 dark:border-slate-700">
            <Target className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h2 className="text-slate-600 dark:text-slate-300 font-medium mb-1">No budgets yet</h2>
            <p className="text-sm text-slate-400 mb-4">Set monthly limits to track your spending</p>
            <Button onClick={() => setShowForm(true)}>Create budget</Button>
          </div>
        )}

        <div className="space-y-3">
          {budgets.map(b => (
            <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="glass-hover">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{b.category}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        (b.percent ?? 0) >= 100 ? "destructive" :
                        (b.percent ?? 0) >= 80 ? "warning" : "default"
                      }>
                        {b.percent ?? 0}% used
                      </Badge>
                      <button onClick={() => deleteBudget(b.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: (b.percent ?? 0) >= 100 ? "#ef4444" : (b.percent ?? 0) >= 80 ? "#f59e0b" : "#10b981",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(b.percent ?? 0, 100)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{formatCurrency(b.spent ?? 0)} spent</span>
                    <span>{formatCurrency(Math.max(0, Number(b.limit_amount) - (b.spent ?? 0)))} remaining of {formatCurrency(Number(b.limit_amount))}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
