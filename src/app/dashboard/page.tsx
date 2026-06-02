import { createClient } from "@/lib/supabase/server"
import { OverviewClient } from "@/components/dashboard/overview-client"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const lastMonth = month === 1 ? 12 : month - 1
  const lastYear = month === 1 ? year - 1 : year
  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`
  const endOfMonth = `${year}-${String(month).padStart(2, "0")}-31`

  const [
    { data: currentSummary },
    { data: lastSummary },
    { data: budgets },
    { data: recurring },
    { data: recentTx },
    { data: monthSpending },
  ] = await Promise.all([
    supabase.from("monthly_summaries").select("*").eq("user_id", user!.id).eq("year", year).eq("month", month).single(),
    supabase.from("monthly_summaries").select("*").eq("user_id", user!.id).eq("year", lastYear).eq("month", lastMonth).single(),
    supabase.from("budgets").select("*").eq("user_id", user!.id),
    supabase.from("recurring_charges").select("*").eq("user_id", user!.id).order("amount", { ascending: false }).limit(5),
    supabase.from("transactions").select("*").eq("user_id", user!.id).order("date", { ascending: false }).limit(8),
    supabase.from("transactions").select("category, amount").eq("user_id", user!.id).eq("is_income", false).gte("date", startOfMonth).lte("date", endOfMonth),
  ])

  const spentByCategory: Record<string, number> = {}
  for (const t of monthSpending ?? []) {
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
