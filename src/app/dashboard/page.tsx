import { createClient } from "@/lib/supabase/server"
import { OverviewClient } from "@/components/dashboard/overview-client"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1        // 1-indexed
  const lastMonth = month === 1 ? 12 : month - 1
  const lastYear = month === 1 ? year - 1 : year
  const pad = (n: number) => String(n).padStart(2, "0")
  const startOfMonth = `${year}-${pad(month)}-01`
  // new Date(year, month, 0) = last day of current month (month here is 1-indexed,
  // so passing it directly gives day-0 of next month = last day of this month)
  const endOfMonth = new Date(year, month, 0).toISOString().slice(0, 10)

  const [
    { data: currentTxns },
    { data: lastSummary },
    { data: budgets },
    { data: recurring },
    { data: recentTx },
  ] = await Promise.all([
    // Live current-month transactions — covers both imported and manual entries
    supabase
      .from("transactions")
      .select("category, amount, is_income")
      .eq("user_id", user!.id)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth),
    // Last month from pre-aggregated table (historical, won't change)
    supabase
      .from("monthly_summaries")
      .select("total_spent, total_income")
      .eq("user_id", user!.id)
      .eq("year", lastYear)
      .eq("month", lastMonth)
      .single(),
    supabase.from("budgets").select("*").eq("user_id", user!.id),
    supabase
      .from("recurring_charges")
      .select("*")
      .eq("user_id", user!.id)
      .order("amount", { ascending: false })
      .limit(5),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user!.id)
      .order("date", { ascending: false })
      .limit(8),
  ])

  // Compute current-month stats from live transactions
  const expenses = (currentTxns ?? []).filter(t => !t.is_income)
  const incomeItems = (currentTxns ?? []).filter(t => t.is_income)
  const totalSpent = expenses.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalIncome = incomeItems.reduce((sum, t) => sum + Number(t.amount), 0)

  const categoryBreakdown: Record<string, number> = {}
  for (const t of expenses) {
    categoryBreakdown[t.category] = (categoryBreakdown[t.category] ?? 0) + Number(t.amount)
  }

  const currentSummary = (currentTxns?.length ?? 0) > 0
    ? {
        total_spent: totalSpent,
        total_income: totalIncome,
        category_breakdown: categoryBreakdown,
        transaction_count: currentTxns!.length,
      }
    : null

  // Budget spending uses same live computation
  const spentByCategory: Record<string, number> = {}
  for (const t of expenses) {
    spentByCategory[t.category] = (spentByCategory[t.category] ?? 0) + Number(t.amount)
  }

  const budgetsWithSpending = (budgets ?? []).map(b => ({
    ...b,
    spent: spentByCategory[b.category] ?? 0,
    percent: Math.round(((spentByCategory[b.category] ?? 0) / Number(b.limit_amount)) * 100),
  }))

  return (
    <OverviewClient
      currentSummary={currentSummary}
      lastSummary={lastSummary}
      budgets={budgetsWithSpending}
      recurring={recurring ?? []}
      recentTransactions={recentTx ?? []}
      userName={user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "there"}
    />
  )
}
