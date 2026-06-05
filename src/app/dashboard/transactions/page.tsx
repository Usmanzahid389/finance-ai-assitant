"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Loader2, ArrowUpRight, ArrowDownLeft, Plus,
  Trash2, Pencil, Filter, X, ChevronLeft, ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { createClient } from "@/lib/supabase/client"
import { formatDate, categoryColor } from "@/lib/utils"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { toast } from "sonner"

interface Transaction {
  id: string; date: string; description: string; amount: number;
  category: string; merchant: string | null; is_income: boolean; source: string
}

const PAGE_SIZE = 25

const COMMON_CATEGORIES = [
  "Groceries", "Dining", "Transport", "Shopping", "Entertainment",
  "Healthcare", "Utilities", "Fitness", "Subscriptions", "Education",
  "Travel", "Housing", "Income", "Other",
]

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  description: "",
  amount: "",
  category: "Other",
  merchant: "",
  is_income: false,
}

export default function TransactionsPage() {
  const formatCurrency = useFormatCurrency()
  const supabase = createClient()
  const router = useRouter()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [userCategories, setUserCategories] = useState<string[]>([])

  // Filters
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  useEffect(() => { init() }, [])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [search, categoryFilter, typeFilter, dateFrom, dateTo])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: txns }, { data: cats }] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("categories").select("name").eq("user_id", user.id).order("name"),
    ])

    setTransactions(txns ?? [])
    setUserCategories(cats?.map(c => c.name) ?? [])
    setLoading(false)
  }

  const allCategories = [...new Set([...userCategories, ...COMMON_CATEGORIES])]
  const displayCategories = [...new Set(transactions.map(t => t.category))].sort()

  const filtered = transactions.filter(t => {
    if (search) {
      const q = search.toLowerCase()
      if (!t.description.toLowerCase().includes(q) && !(t.merchant ?? "").toLowerCase().includes(q)) return false
    }
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false
    if (typeFilter === "income" && !t.is_income) return false
    if (typeFilter === "expense" && t.is_income) return false
    if (dateFrom && t.date < dateFrom) return false
    if (dateTo && t.date > dateTo) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const stats = filtered.reduce(
    (acc, t) => {
      if (t.is_income) acc.income += Number(t.amount)
      else acc.expenses += Number(t.amount)
      return acc
    },
    { income: 0, expenses: 0 }
  )

  const hasActiveFilters = typeFilter !== "all" || !!dateFrom || !!dateTo || categoryFilter !== "all"

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) })
    setModalOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setForm({
      date: t.date,
      description: t.description,
      amount: String(t.amount),
      category: t.category,
      merchant: t.merchant ?? "",
      is_income: t.is_income,
    })
    setModalOpen(true)
  }

  async function save() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)

    const body = {
      id: editing?.id,
      date: form.date,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      merchant: form.merchant.trim() || null,
      is_income: form.is_income,
    }

    const res = await fetch("/api/transactions", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Failed to save transaction")
      setSaving(false)
      return
    }

    toast.success(editing ? "Transaction updated" : "Transaction added")
    setSaving(false)
    setModalOpen(false)
    init()
    router.refresh()
  }

  async function remove(id: string) {
    const res = await fetch("/api/transactions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })

    if (!res.ok) { toast.error("Failed to delete"); return }
    toast.success("Transaction deleted")
    setTransactions(prev => prev.filter(t => t.id !== id))
    setPendingDelete(null)
    router.refresh()
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
    </div>
  )

  const startRow = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const endRow = Math.min(safePage * PAGE_SIZE, filtered.length)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-100">Transactions</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {filtered.length} of {transactions.length} total
            </p>
          </div>
          <Button onClick={openAdd} size="sm" className="shrink-0">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add transaction</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Income</p>
            <p className="text-sm font-semibold text-emerald-400 tabular-nums truncate">
              {formatCurrency(stats.income)}
            </p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Expenses</p>
            <p className="text-sm font-semibold text-red-400 tabular-nums truncate">
              {formatCurrency(stats.expenses)}
            </p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Net</p>
            <p className={`text-sm font-semibold tabular-nums truncate ${
              stats.income - stats.expenses >= 0 ? "text-emerald-400" : "text-red-400"
            }`}>
              {formatCurrency(stats.income - stats.expenses)}
            </p>
          </div>
        </div>

        {/* Search + filter toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by description or merchant…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-sm transition-all shrink-0 ${
              hasActiveFilters
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>
        </div>

        {/* Expanded filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass rounded-xl p-4 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {(["all", "income", "expense"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                        typeFilter === t
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All categories</option>
                    {displayCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setTypeFilter("all"); setDateFrom(""); setDateTo(""); setCategoryFilter("all") }}
                    className="text-xs text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />Clear filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table — desktop & tablet */}
        <div className="glass rounded-xl overflow-hidden hidden sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-500 w-28">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-500">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-500 hidden lg:table-cell w-36">Merchant</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-500 w-32">Category</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-500 w-28">Amount</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-600 dark:text-slate-500 text-sm">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  paginated.map((t, i) => (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.008 }}
                      className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: `${categoryColor(t.category)}15` }}
                          >
                            {t.is_income
                              ? <ArrowDownLeft className="w-3 h-3" style={{ color: categoryColor(t.category) }} />
                              : <ArrowUpRight className="w-3 h-3" style={{ color: categoryColor(t.category) }} />
                            }
                          </div>
                          <span className="text-slate-700 dark:text-slate-200 truncate max-w-xs">
                            {t.description}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs truncate max-w-[140px] hidden lg:table-cell">
                        {t.merchant ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: `${categoryColor(t.category)}18`,
                            color: categoryColor(t.category),
                          }}
                        >
                          {t.category}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap ${
                        t.is_income ? "text-emerald-500 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"
                      }`}>
                        {t.is_income ? "+" : "−"}{formatCurrency(Number(t.amount))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPendingDelete(t.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card list — mobile only */}
        <div className="sm:hidden glass rounded-xl overflow-hidden">
          {paginated.length === 0 ? (
            <div className="p-8 text-center text-slate-600 dark:text-slate-500 text-sm">No transactions found</div>
          ) : (
            paginated.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.01 }}
                className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 last:border-0"
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
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(t.date)}</span>
                    <span className="text-slate-600 dark:text-slate-700">·</span>
                    <span className="text-xs" style={{ color: categoryColor(t.category) }}>{t.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-sm font-medium tabular-nums ${
                    t.is_income ? "text-emerald-500 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"
                  }`}>
                    {t.is_income ? "+" : "−"}{formatCurrency(Number(t.amount))}
                  </span>
                  <button onClick={() => openEdit(t)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setPendingDelete(t.id)} className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-4 py-1">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Showing <span className="text-slate-700 dark:text-slate-300">{startRow}–{endRow}</span> of{" "}
              <span className="text-slate-700 dark:text-slate-300">{filtered.length}</span> transactions
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…")
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, idx) =>
                    p === "…" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400 dark:text-slate-600">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                          safePage === p
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit transaction" : "Add transaction"}
      >
        <div className="space-y-4">
          {/* Type toggle */}
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setForm(f => ({ ...f, is_income: false }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                  !form.is_income
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                Expense
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, is_income: true }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                  form.is_income
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Description</label>
            <Input
              placeholder="e.g. Coffee at Starbucks"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Merchant (optional)</label>
              <Input
                placeholder="e.g. Starbucks"
                value={form.merchant}
                onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={save}
              disabled={saving || !form.description.trim() || !form.amount}
              className="flex-1"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : editing ? "Save changes" : "Add transaction"
              }
            </Button>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title="Delete transaction?"
        message="This transaction will be permanently removed. This cannot be undone."
      />
    </div>
  )
}
