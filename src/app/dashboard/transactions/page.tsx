"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { formatDate, categoryColor } from "@/lib/utils"
import { useFormatCurrency } from "@/hooks/use-format-currency"

interface Transaction {
  id: string; date: string; description: string; amount: number;
  category: string; merchant: string | null; is_income: boolean; source: string
}

export default function TransactionsPage() {
  const formatCurrency = useFormatCurrency()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => { loadTransactions() }, [])

  async function loadTransactions() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(200)

    if (data) {
      setTransactions(data)
      const cats = [...new Set(data.map(t => t.category))].sort()
      setCategories(cats)
    }
    setLoading(false)
  }

  const filtered = transactions.filter(t => {
    const matchSearch = !search || t.description.toLowerCase().includes(search.toLowerCase()) || (t.merchant ?? "").toLowerCase().includes(search.toLowerCase())
    const matchCat = category === "all" || t.category === category
    return matchSearch && matchCat
  })

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">Transactions</h1>
          <p className="text-sm text-slate-500">{transactions.length} transactions</p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input placeholder="Search transactions…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white text-slate-700 px-3 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="glass rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No transactions found</div>
          ) : (
            filtered.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.01 }}
                className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${categoryColor(t.category)}15` }}
                >
                  {t.is_income
                    ? <ArrowDownLeft className="w-3.5 h-3.5" style={{ color: categoryColor(t.category) }} />
                    : <ArrowUpRight className="w-3.5 h-3.5" style={{ color: categoryColor(t.category) }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{t.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{formatDate(t.date)}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="text-xs" style={{ color: categoryColor(t.category) }}>{t.category}</span>
                  </div>
                </div>
                <span className={`text-sm font-medium ${t.is_income ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
                  {t.is_income ? "+" : "-"}{formatCurrency(Number(t.amount))}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
