import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function syncSummary(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, date: string) {
  const [year, month] = date.slice(0, 7).split("-").map(Number)
  await supabase.rpc("upsert_monthly_summary", { p_user_id: userId, p_year: year, p_month: month })
}

// POST — create a manual transaction
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { date, description, amount, category, merchant, is_income } = body

  if (!date || !description || amount == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      date,
      description: description.trim(),
      amount: parseFloat(amount),
      category: category ?? "Other",
      merchant: merchant?.trim() || null,
      is_income: !!is_income,
      source: "manual",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await syncSummary(supabase, user.id, date)

  return NextResponse.json(data)
}

// PATCH — update an existing transaction
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, date, description, amount, category, merchant, is_income } = body

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  // Fetch original date so we can sync both the old and new month
  const { data: original } = await supabase
    .from("transactions")
    .select("date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  const { data, error } = await supabase
    .from("transactions")
    .update({
      date,
      description: description.trim(),
      amount: parseFloat(amount),
      category: category ?? "Other",
      merchant: merchant?.trim() || null,
      is_income: !!is_income,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync summary for both old month (if date changed) and new month
  const monthsToSync = [...new Set([original?.date?.slice(0, 7), date?.slice(0, 7)].filter(Boolean))]
  await Promise.all(monthsToSync.map(m => syncSummary(supabase, user.id, m + "-01")))

  return NextResponse.json(data)
}

// DELETE — remove a transaction
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  // Fetch date before deleting so we can sync the right month
  const { data: original } = await supabase
    .from("transactions")
    .select("date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (original?.date) await syncSummary(supabase, user.id, original.date)

  return NextResponse.json({ ok: true })
}
