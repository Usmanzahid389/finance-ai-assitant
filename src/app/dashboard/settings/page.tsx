"use client"

import { useState, useEffect } from "react"
import { Loader2, Save, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useCurrency } from "@/components/providers/currency-provider"
import { toast } from "sonner"

const CONTEXT_FIELDS = [
  { key: "pay_date", label: "Pay date", placeholder: "e.g. 1st of the month" },
  { key: "monthly_income", label: "Monthly income", placeholder: "e.g. 5000" },
  { key: "savings_goal", label: "Savings goal", placeholder: "e.g. $10,000 emergency fund" },
  { key: "food_budget_exclusions", label: "Exclude from food budget", placeholder: "e.g. rent, utilities" },
  { key: "notes", label: "Other notes for the AI", placeholder: "Anything else the assistant should know" },
]

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar", symbol: "$" },
  { code: "EUR", label: "EUR — Euro", symbol: "€" },
  { code: "GBP", label: "GBP — British Pound", symbol: "£" },
  { code: "CAD", label: "CAD — Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "AUD — Australian Dollar", symbol: "A$" },
  { code: "JPY", label: "JPY — Japanese Yen", symbol: "¥" },
  { code: "CHF", label: "CHF — Swiss Franc", symbol: "CHF" },
  { code: "INR", label: "INR — Indian Rupee", symbol: "₹" },
  { code: "BRL", label: "BRL — Brazilian Real", symbol: "R$" },
  { code: "MXN", label: "MXN — Mexican Peso", symbol: "MX$" },
  { code: "SGD", label: "SGD — Singapore Dollar", symbol: "S$" },
  { code: "HKD", label: "HKD — Hong Kong Dollar", symbol: "HK$" },
  { code: "NOK", label: "NOK — Norwegian Krone", symbol: "kr" },
  { code: "SEK", label: "SEK — Swedish Krona", symbol: "kr" },
  { code: "DKK", label: "DKK — Danish Krone", symbol: "kr" },
  { code: "NZD", label: "NZD — New Zealand Dollar", symbol: "NZ$" },
  { code: "AED", label: "AED — UAE Dirham", symbol: "AED" },
  { code: "SAR", label: "SAR — Saudi Riyal", symbol: "SAR" },
  { code: "PKR", label: "PKR — Pakistani Rupee", symbol: "₨" },
  { code: "BDT", label: "BDT — Bangladeshi Taka", symbol: "৳" },
]

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { currency, setCurrency } = useCurrency()
  const [selectedCurrency, setSelectedCurrency] = useState(currency)

  useEffect(() => {
    setSelectedCurrency(currency)
  }, [currency])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("user_context").select("key, value").eq("user_id", user.id)
        .then(({ data }) => {
          if (data) setValues(Object.fromEntries(data.map(r => [r.key, r.value])))
          setLoading(false)
        })
    })
  }, [])

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Save currency via context (also persists to DB)
    await setCurrency(selectedCurrency)

    // Save other context fields
    const entries = Object.entries(values).filter(([k, v]) => k !== "currency" && v.trim())
    await Promise.all(entries.map(([key, value]) =>
      supabase.from("user_context").upsert(
        { user_id: user.id, key, value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" }
      )
    ))

    toast.success("Preferences saved")
    setSaving(false)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Settings</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Personalise your finance assistant</p>
        </div>

        {/* Currency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />Currency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
              All amounts across the dashboard will display in your chosen currency.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => setSelectedCurrency(c.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all border ${
                    selectedCurrency === c.code
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                      : "border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                  style={selectedCurrency !== c.code ? { color: "var(--text-secondary)" } : {}}
                >
                  <span className="font-mono text-xs w-6 shrink-0" style={{ color: "var(--text-muted)" }}>{c.symbol}</span>
                  <span className="truncate">{c.code}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI context */}
        <Card>
          <CardHeader>
            <CardTitle>Your financial context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              These details are sent to the AI assistant to personalise its responses.
            </p>
            {CONTEXT_FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>{f.label}</label>
                <Input
                  value={values[f.key] ?? ""}
                  onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <><Save className="w-4 h-4" />Save preferences</>
          }
        </Button>

        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          Preferences are stored privately and applied immediately.
        </p>
      </div>
    </div>
  )
}
