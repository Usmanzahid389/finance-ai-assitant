import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { categorizeTransaction, inferMerchant, parseAmount, parseDate } from "@/lib/ai/categorize"

const KNOWN_HEADERS: Record<string, string[]> = {
  date: ["date", "transaction date", "trans date", "posted date", "value date"],
  description: ["description", "memo", "narrative", "details", "name", "payee", "merchant"],
  amount: ["amount", "debit", "credit", "transaction amount", "value"],
  category: ["category", "type", "transaction type"],
}

function detectColumn(headers: string[], field: string): number {
  const candidates = KNOWN_HEADERS[field] ?? []
  for (const h of headers) {
    if (candidates.some(c => h.toLowerCase().includes(c))) {
      return headers.indexOf(h)
    }
  }
  return -1
}

function parseCSV(raw: string): string[][] {
  const rows: string[][] = []
  const lines = raw.split(/\r?\n/).filter(l => l.trim())
  for (const line of lines) {
    const cells: string[] = []
    let current = ""
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === "," && !inQuotes) { cells.push(current.trim()); current = "" }
      else { current += ch }
    }
    cells.push(current.trim())
    rows.push(cells)
  }
  return rows
}

function detectRecurring(transactions: Array<{ merchant: string; amount: number; date: string }>): Array<{
  merchant: string; amount: number; frequency: string; last_seen: string; occurrences: number; category: string
}> {
  const groups: Record<string, Array<{ amount: number; date: string }>> = {}
  for (const t of transactions) {
    const key = `${t.merchant}|${t.amount}`
    if (!groups[key]) groups[key] = []
    groups[key].push({ amount: t.amount, date: t.date })
  }

  const recurring = []
  for (const [key, entries] of Object.entries(groups)) {
    if (entries.length < 2) continue
    const [merchant] = key.split("|")
    entries.sort((a, b) => a.date.localeCompare(b.date))

    const gaps: number[] = []
    for (let i = 1; i < entries.length; i++) {
      const d1 = new Date(entries[i - 1].date)
      const d2 = new Date(entries[i].date)
      gaps.push(Math.abs((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length

    let frequency: string | null = null
    if (avgGap >= 6 && avgGap <= 8) frequency = "weekly"
    else if (avgGap >= 25 && avgGap <= 35) frequency = "monthly"
    else if (avgGap >= 350 && avgGap <= 380) frequency = "yearly"

    if (frequency && entries.length >= 2) {
      const { category } = categorizeTransaction(merchant)
      recurring.push({
        merchant,
        amount: entries[0].amount,
        frequency,
        last_seen: entries[entries.length - 1].date,
        occurrences: entries.length,
        category: category === "Other" ? "Subscriptions" : category,
      })
    }
  }
  return recurring
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (rows.length < 2) return NextResponse.json({ error: "CSV appears empty or malformed" }, { status: 400 })

  const headers = rows[0].map(h => h.replace(/"/g, "").toLowerCase())
  const dateCol = detectColumn(headers, "date")
  const descCol = detectColumn(headers, "description")
  const amtCol = detectColumn(headers, "amount")

  if (dateCol === -1 || descCol === -1 || amtCol === -1) {
    return NextResponse.json({
      error: `Could not detect required columns. Found headers: ${headers.join(", ")}. Expected: date, description, amount.`,
    }, { status: 400 })
  }

  const seen = new Set<string>()
  const transactions: Array<{
    user_id: string; date: string; description: string; amount: number;
    category: string; merchant: string; is_income: boolean; source: string; currency: string
  }> = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < 3) continue

    const rawDate = row[dateCol]?.replace(/"/g, "")
    const rawDesc = row[descCol]?.replace(/"/g, "")
    const rawAmt = row[amtCol]?.replace(/"/g, "")

    const date = parseDate(rawDate)
    if (!date || !rawDesc) continue

    const { amount, isIncome: amtIsIncome } = parseAmount(rawAmt)
    if (amount === 0) continue

    const { category, isIncome: catIsIncome } = categorizeTransaction(rawDesc)
    const merchant = inferMerchant(rawDesc)
    const is_income = amtIsIncome || catIsIncome

    const dedupeKey = `${date}|${rawDesc}|${amount}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    transactions.push({
      user_id: user.id, date, description: rawDesc, amount,
      category, merchant, is_income, source: "csv", currency: "USD",
    })
  }

  if (!transactions.length) {
    return NextResponse.json({ error: "No valid transactions found in CSV" }, { status: 400 })
  }

  // Batch insert transactions
  const BATCH = 200
  let imported = 0
  for (let i = 0; i < transactions.length; i += BATCH) {
    const { error } = await supabase.from("transactions").upsert(
      transactions.slice(i, i + BATCH),
      { ignoreDuplicates: true }
    )
    if (!error) imported += Math.min(BATCH, transactions.length - i)
  }

  // Recompute monthly summaries for affected months
  const months = [...new Set(transactions.map(t => t.date.slice(0, 7)))]
  await Promise.all(
    months.map(m => {
      const [year, month] = m.split("-").map(Number)
      return supabase.rpc("upsert_monthly_summary", { p_user_id: user.id, p_year: year, p_month: month })
    })
  )

  // Detect and store recurring charges
  const recurring = detectRecurring(transactions)
  if (recurring.length) {
    await supabase.from("recurring_charges").upsert(
      recurring.map(r => ({ ...r, user_id: user.id })),
      { onConflict: "user_id,merchant,frequency" }
    )
  }

  return NextResponse.json({
    imported,
    total_in_file: rows.length - 1,
    skipped: rows.length - 1 - imported,
    months_updated: months.length,
    recurring_detected: recurring.length,
  })
}
