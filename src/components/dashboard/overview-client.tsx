"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  TrendingUp, TrendingDown, Wallet, RefreshCw,
  Target, ArrowUpRight, ArrowDownRight, MessageSquare, Upload, Plus
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardValue, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SpendingChart } from "@/components/dashboard/spending-chart"
import { formatShortDate, categoryColor } from "@/lib/utils"
import { useFormatCurrency } from "@/hooks/use-format-currency"

interface Props {
  currentSummary: {
    total_spent: number; total_income: number
    category_breakdown: Record<string, number>
    transaction_count: number
  } | null
  lastSummary: { total_spent: number; total_income: number } | null
  budgets: Array<{ id: string; category: string; limit_amount: number; spent: number; percent: number }>
  recurring: Array<{ merchant: string; amount: number; frequency: string }>
  recentTransactions: Array<{ id: string; date: string; description: string; amount: number; category: string; is_income: boolean }>
  userName: string
}

const stagger = { animate: { transition: { staggerChildren: 0.07 } } }
const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

export function OverviewClient({ currentSummary, lastSummary, budgets, recurring, recentTransactions, userName }: Props) {
  const formatCurrency = useFormatCurrency()
  const spent = Number(currentSummary?.total_spent ?? 0)
  const income = Number(currentSummary?.total_income ?? 0)
  const lastSpent = Number(lastSummary?.total_spent ?? 0)
  const spentDelta = lastSpent ? ((spent - lastSpent) / lastSpent) * 100 : 0
  const net = income - spent
  const hasData = !!currentSummary

  const categoryData = Object.entries(currentSummary?.category_breakdown ?? {})
    .map(([name, value]) => ({ name, value: Number(value), fill: categoryColor(name) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">

        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              Good {getGreeting()}, {userName}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/import">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Upload className="w-3.5 h-3.5" />Import
              </Button>
            </Link>
            <Link href="/dashboard/chat">
              <Button size="sm" className="gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />Ask AI
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Import nudge */}
        {!hasData && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-3 glass rounded-xl px-4 py-3 border border-dashed border-slate-300 dark:border-slate-700/60">
              <Upload className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-sm text-slate-500 flex-1">Import a CSV to populate your dashboard with real data.</p>
              <Link href="/dashboard/import">
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                  <Plus className="w-3 h-3" />Import CSV
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        <>
          {/* KPI row */}
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
            <Card className="glass-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" />This month's spend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardValue>{formatCurrency(spent)}</CardValue>
                {lastSpent > 0 && (
                  <div className={`flex items-center gap-1 mt-1 text-xs ${spentDelta > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {spentDelta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(spentDelta).toFixed(1)}% vs last month
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardValue className="text-emerald-600 dark:text-emerald-400">{formatCurrency(income)}</CardValue>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{currentSummary?.transaction_count ?? 0} transactions</p>
              </CardContent>
            </Card>

            <Card className="glass-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  {net >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  Net this month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardValue className={net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>
                  {net >= 0 ? "+" : ""}{formatCurrency(net)}
                </CardValue>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{net >= 0 ? "Saving money" : "Overspending"}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Chart + Breakdown */}
          <motion.div variants={fadeUp} className="grid grid-cols-5 gap-4">
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Spending by category</CardTitle>
              </CardHeader>
              <CardContent>
                <SpendingChart data={categoryData} />
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Top categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {categoryData.slice(0, 5).map(c => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.fill }} />
                      <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{c.name}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 ml-2">{formatCurrency(c.value)}</span>
                  </div>
                ))}
                {categoryData.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No spending data yet</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Budgets + Recent Tx */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between mb-0">
                <CardTitle className="flex items-center gap-1.5 mb-0">
                  <Target className="w-3.5 h-3.5" />Budgets
                </CardTitle>
                <Link href="/dashboard/budgets">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors">Manage</span>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3 mt-3">
                {budgets.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No budgets set. <Link href="/dashboard/budgets" className="text-emerald-600 dark:text-emerald-400">Create one</Link></p>
                )}
                {budgets.slice(0, 4).map(b => (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600 dark:text-slate-300">{b.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{formatCurrency(b.spent)} / {formatCurrency(Number(b.limit_amount))}</span>
                        <Badge variant={b.percent >= 100 ? "destructive" : b.percent >= 80 ? "warning" : "default"}>
                          {b.percent}%
                        </Badge>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: b.percent >= 100 ? "#ef4444" : b.percent >= 80 ? "#f59e0b" : "#10b981" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(b.percent, 100)}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between mb-0">
                <CardTitle className="flex items-center gap-1.5 mb-0">
                  <Wallet className="w-3.5 h-3.5" />Recent transactions
                </CardTitle>
                <Link href="/dashboard/transactions">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors">View all</span>
                </Link>
              </CardHeader>
              <CardContent className="space-y-1 mt-3">
                {recentTransactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[160px]">{t.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatShortDate(t.date)} · {t.category}</p>
                    </div>
                    <span className={`text-xs font-medium ml-2 ${t.is_income ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-200"}`}>
                      {t.is_income ? "+" : "-"}{formatCurrency(Number(t.amount))}
                    </span>
                  </div>
                ))}
                {recentTransactions.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No transactions yet</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recurring charges */}
          {recurring.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader className="flex-row items-center justify-between mb-0">
                  <CardTitle className="flex items-center gap-1.5 mb-0">
                    <RefreshCw className="w-3.5 h-3.5" />Recurring subscriptions
                  </CardTitle>
                  <Link href="/dashboard/subscriptions">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors">View all</span>
                  </Link>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 mt-3">
                  {recurring.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 glass rounded-lg px-3 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      <span className="text-xs text-slate-600 dark:text-slate-300">{r.merchant}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(Number(r.amount))}/{r.frequency === "monthly" ? "mo" : r.frequency === "yearly" ? "yr" : "wk"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      </motion.div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "morning"
  if (h < 17) return "afternoon"
  return "evening"
}
