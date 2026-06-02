"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Loader2, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardValue } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useFormatCurrency } from "@/hooks/use-format-currency"

interface Recurring {
  id: string; merchant: string; amount: number; frequency: string; last_seen: string; occurrences: number; category: string
}

export default function SubscriptionsPage() {
  const formatCurrency = useFormatCurrency()
  const [recurring, setRecurring] = useState<Recurring[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("recurring_charges").select("*").eq("user_id", user.id).order("amount", { ascending: false })
        .then(({ data }) => { setRecurring(data ?? []); setLoading(false) })
    })
  }, [])

  const monthlyTotal = recurring.reduce((sum, r) => {
    if (r.frequency === "monthly") return sum + Number(r.amount)
    if (r.frequency === "yearly") return sum + Number(r.amount) / 12
    if (r.frequency === "weekly") return sum + Number(r.amount) * 4.33
    return sum
  }, 0)

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 text-slate-500 animate-spin" /></div>

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 mb-1">Subscriptions</h1>
          <p className="text-sm text-slate-500">Auto-detected recurring charges</p>
        </div>

        {recurring.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Monthly cost</CardTitle></CardHeader>
              <CardContent><CardValue className="text-red-400">{formatCurrency(monthlyTotal)}</CardValue></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Yearly estimate</CardTitle></CardHeader>
              <CardContent><CardValue className="text-amber-400">{formatCurrency(monthlyTotal * 12)}</CardValue></CardContent>
            </Card>
          </div>
        )}

        {recurring.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center border border-dashed border-slate-700">
            <RefreshCw className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h2 className="text-slate-300 font-medium mb-1">No subscriptions detected</h2>
            <p className="text-sm text-slate-500">Import more transaction history to detect recurring charges</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recurring.map(r => (
              <div key={r.id} className="glass glass-hover rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-200 font-medium">{r.merchant}</p>
                    <p className="text-xs text-slate-500">Last: {r.last_seen} · {r.occurrences}×</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-200">{formatCurrency(Number(r.amount))}</p>
                  <Badge variant="violet" className="mt-0.5">{r.frequency}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
