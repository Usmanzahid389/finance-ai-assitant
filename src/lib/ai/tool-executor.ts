import { SupabaseClient } from "@supabase/supabase-js"

interface QueryFilters {
  date_from?: string
  date_to?: string
  category?: string
  merchant?: string
  min_amount?: number
  max_amount?: number
  is_income?: boolean
  limit?: number
}

export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<unknown> {
  switch (toolName) {
    case "query_transactions":
      return queryTransactions(supabase, userId, toolInput as { filters: QueryFilters; aggregate: string })

    case "get_monthly_summaries":
      return getMonthlySummaries(supabase, userId, toolInput as { months_back?: number; specific_months?: Array<{ year: number; month: number }> })

    case "get_budget_status":
      return getBudgetStatus(supabase, userId)

    case "get_recurring_charges":
      return getRecurringCharges(supabase, userId)

    case "get_user_context":
      return getUserContext(supabase, userId)

    case "save_user_context":
      return saveUserContext(supabase, userId, toolInput as { key: string; value: string })

    case "set_budget":
      return setBudget(supabase, userId, toolInput as { category: string; limit_amount: number; period: string })

    case "web_search":
      return webSearch(toolInput as { query: string })

    case "flag_anomaly":
      return toolInput

    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

async function queryTransactions(
  supabase: SupabaseClient,
  userId: string,
  { filters, aggregate }: { filters: QueryFilters; aggregate: string }
) {
  let query = supabase.from("transactions").select("*").eq("user_id", userId)

  if (filters.date_from) query = query.gte("date", filters.date_from)
  if (filters.date_to) query = query.lte("date", filters.date_to)
  if (filters.category) query = query.ilike("category", `%${filters.category}%`)
  if (filters.merchant) query = query.ilike("merchant", `%${filters.merchant}%`)
  if (filters.min_amount != null) query = query.gte("amount", filters.min_amount)
  if (filters.max_amount != null) query = query.lte("amount", filters.max_amount)
  if (filters.is_income != null) query = query.eq("is_income", filters.is_income)
  query = query.order("date", { ascending: false }).limit(filters.limit ?? 50)

  const { data, error } = await query
  if (error) return { error: error.message }
  if (!data?.length) return { result: "No transactions found matching those criteria." }

  if (aggregate === "sum_by_category") {
    const totals: Record<string, number> = {}
    for (const t of data) {
      totals[t.category] = (totals[t.category] ?? 0) + Number(t.amount)
    }
    return { aggregate: "sum_by_category", data: Object.entries(totals).map(([category, total]) => ({ category, total: total.toFixed(2) })).sort((a, b) => Number(b.total) - Number(a.total)) }
  }

  if (aggregate === "sum_by_month") {
    const totals: Record<string, number> = {}
    for (const t of data) {
      const key = t.date.slice(0, 7)
      totals[key] = (totals[key] ?? 0) + Number(t.amount)
    }
    return { aggregate: "sum_by_month", data: Object.entries(totals).map(([month, total]) => ({ month, total: total.toFixed(2) })).sort((a, b) => a.month.localeCompare(b.month)) }
  }

  if (aggregate === "sum_by_merchant") {
    const totals: Record<string, number> = {}
    for (const t of data) {
      const m = t.merchant || t.description
      totals[m] = (totals[m] ?? 0) + Number(t.amount)
    }
    return { aggregate: "sum_by_merchant", data: Object.entries(totals).map(([merchant, total]) => ({ merchant, total: total.toFixed(2) })).sort((a, b) => Number(b.total) - Number(a.total)) }
  }

  return {
    count: data.length,
    transactions: data.map(t => ({
      date: t.date, description: t.description, amount: t.amount,
      category: t.category, merchant: t.merchant, is_income: t.is_income,
    })),
  }
}

async function getMonthlySummaries(
  supabase: SupabaseClient,
  userId: string,
  { months_back = 6, specific_months }: { months_back?: number; specific_months?: Array<{ year: number; month: number }> }
) {
  let query = supabase
    .from("monthly_summaries")
    .select("*")
    .eq("user_id", userId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })

  if (specific_months?.length) {
    // handled below — fetch all and filter
  } else {
    query = query.limit(months_back)
  }

  const { data, error } = await query
  if (error) return { error: error.message }
  if (!data?.length) return { result: "No monthly summaries found. The user may not have imported data yet." }

  const summaries = specific_months?.length
    ? data.filter(s => specific_months.some(m => m.year === s.year && m.month === s.month))
    : data

  return {
    summaries: summaries.map(s => ({
      year: s.year,
      month: s.month,
      label: new Date(s.year, s.month - 1).toLocaleString("en-US", { month: "long", year: "numeric" }),
      total_spent: Number(s.total_spent).toFixed(2),
      total_income: Number(s.total_income).toFixed(2),
      net: (Number(s.total_income) - Number(s.total_spent)).toFixed(2),
      transaction_count: s.transaction_count,
      top_categories: Object.entries(s.category_breakdown as Record<string, number>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, amt]) => ({ category: cat, amount: amt.toFixed(2) })),
    })),
  }
}

async function getBudgetStatus(supabase: SupabaseClient, userId: string) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`
  const endOfMonth = `${year}-${String(month).padStart(2, "0")}-31`

  const [{ data: budgets }, { data: spending }] = await Promise.all([
    supabase.from("budgets").select("*").eq("user_id", userId),
    supabase.from("transactions")
      .select("category, amount")
      .eq("user_id", userId)
      .eq("is_income", false)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth),
  ])

  if (!budgets?.length) return { result: "No budgets set yet." }

  const spentByCategory: Record<string, number> = {}
  for (const t of spending ?? []) {
    spentByCategory[t.category] = (spentByCategory[t.category] ?? 0) + Number(t.amount)
  }

  return {
    budgets: budgets.map(b => {
      const spent = spentByCategory[b.category] ?? 0
      const pct = Math.round((spent / Number(b.limit_amount)) * 100)
      return {
        category: b.category,
        limit: Number(b.limit_amount).toFixed(2),
        spent: spent.toFixed(2),
        remaining: Math.max(0, Number(b.limit_amount) - spent).toFixed(2),
        percent_used: pct,
        status: pct >= 100 ? "over" : pct >= 80 ? "warning" : "ok",
      }
    }),
  }
}

async function getRecurringCharges(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("recurring_charges")
    .select("*")
    .eq("user_id", userId)
    .order("amount", { ascending: false })

  if (error) return { error: error.message }
  if (!data?.length) return { result: "No recurring charges detected yet." }

  const monthlyTotal = data.reduce((sum, r) => {
    if (r.frequency === "monthly") return sum + Number(r.amount)
    if (r.frequency === "yearly") return sum + Number(r.amount) / 12
    if (r.frequency === "weekly") return sum + Number(r.amount) * 4.33
    return sum
  }, 0)

  return {
    charges: data.map(r => ({
      merchant: r.merchant,
      amount: Number(r.amount).toFixed(2),
      frequency: r.frequency,
      last_seen: r.last_seen,
      category: r.category,
    })),
    monthly_total_estimate: monthlyTotal.toFixed(2),
    yearly_total_estimate: (monthlyTotal * 12).toFixed(2),
  }
}

async function getUserContext(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("user_context").select("key, value").eq("user_id", userId)
  if (!data?.length) return { context: {} }
  return { context: Object.fromEntries(data.map(r => [r.key, r.value])) }
}

async function saveUserContext(supabase: SupabaseClient, userId: string, { key, value }: { key: string; value: string }) {
  const { error } = await supabase.from("user_context").upsert(
    { user_id: userId, key, value, updated_at: new Date().toISOString() },
    { onConflict: "user_id,key" }
  )
  if (error) return { error: error.message }
  return { saved: true, key, value }
}

async function setBudget(supabase: SupabaseClient, userId: string, { category, limit_amount, period }: { category: string; limit_amount: number; period: string }) {
  const { error } = await supabase.from("budgets").upsert(
    { user_id: userId, category, limit_amount, period },
    { onConflict: "user_id,category,period" }
  )
  if (error) return { error: error.message }
  return { saved: true, category, limit_amount, period }
}

async function webSearch({ query }: { query: string }) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    return { result: `Unable to search: no search API configured. Based on the merchant name "${query}", this could be a subscription service, retail purchase, or utility charge. Check the merchant's website for more details.` }
  }

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`,
      { headers: { "Accept": "application/json", "X-Subscription-Token": apiKey } }
    )
    const json = await res.json()
    const results = json.web?.results?.slice(0, 3).map((r: { title: string; description: string; url: string }) => ({
      title: r.title,
      description: r.description,
      url: r.url,
    }))
    return { query, results }
  } catch {
    return { error: "Search failed", query }
  }
}
