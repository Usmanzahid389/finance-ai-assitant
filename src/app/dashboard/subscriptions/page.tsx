"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Loader2, TrendingUp, Plus, Trash2, Pencil } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardValue } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { createClient } from "@/lib/supabase/client"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { toast } from "sonner"

interface Recurring {
  id: string; merchant: string; amount: number; frequency: string;
  last_seen: string; occurrences: number; category: string
}

const CATEGORIES = [
  "Subscriptions", "Entertainment", "Utilities", "Healthcare",
  "Education", "Software", "News", "Music", "Fitness", "Other",
]

const EMPTY_FORM = {
  merchant: "",
  amount: "",
  frequency: "monthly",
  category: "Subscriptions",
  last_seen: new Date().toISOString().slice(0, 10),
}

export default function SubscriptionsPage() {
  const formatCurrency = useFormatCurrency()
  const supabase = createClient()
  const [recurring, setRecurring] = useState<Recurring[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Recurring | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase
      .from("recurring_charges")
      .select("*")
      .eq("user_id", user.id)
      .order("amount", { ascending: false })

    setRecurring(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, last_seen: new Date().toISOString().slice(0, 10) })
    setModalOpen(true)
  }

  function openEdit(r: Recurring) {
    setEditing(r)
    setForm({
      merchant: r.merchant,
      amount: String(r.amount),
      frequency: r.frequency,
      category: r.category,
      last_seen: r.last_seen,
    })
    setModalOpen(true)
  }

  async function save() {
    if (!form.merchant.trim() || !form.amount) return
    setSaving(true)

    const payload = {
      user_id: userId,
      merchant: form.merchant.trim(),
      amount: parseFloat(form.amount),
      frequency: form.frequency,
      category: form.category,
      last_seen: form.last_seen,
      occurrences: editing?.occurrences ?? 1,
    }

    if (editing) {
      const { error } = await supabase.from("recurring_charges").update(payload).eq("id", editing.id)
      if (error) { toast.error("Failed to update"); setSaving(false); return }
      toast.success("Subscription updated")
    } else {
      const { error } = await supabase.from("recurring_charges").insert(payload)
      if (error) { toast.error("Failed to add"); setSaving(false); return }
      toast.success("Subscription added")
    }

    setSaving(false)
    setModalOpen(false)
    load()
  }

  async function remove(id: string) {
    const { error } = await supabase.from("recurring_charges").delete().eq("id", id)
    if (error) { toast.error("Failed to delete"); return }
    toast.success("Subscription removed")
    setRecurring(prev => prev.filter(r => r.id !== id))
    setPendingDelete(null)
  }

  const monthlyTotal = recurring.reduce((sum, r) => {
    if (r.frequency === "monthly") return sum + Number(r.amount)
    if (r.frequency === "yearly") return sum + Number(r.amount) / 12
    if (r.frequency === "weekly") return sum + Number(r.amount) * 4.33
    return sum
  }, 0)

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">Subscriptions</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{recurring.length} {recurring.length === 1 ? "subscription" : "subscriptions"}</p>
          </div>
          <Button onClick={openAdd} size="sm">
            <Plus className="w-3.5 h-3.5" />Add
          </Button>
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
            <h2 className="text-slate-700 dark:text-slate-300 font-medium mb-1">No subscriptions yet</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Add manually or import transactions to auto-detect recurring charges</p>
            <Button size="sm" onClick={openAdd}>Add subscription</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {recurring.map(r => (
              <div key={r.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{r.merchant}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.category} · Last: {r.last_seen}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-200">{formatCurrency(Number(r.amount))}</p>
                    <Badge variant="violet" className="mt-0.5">{r.frequency}</Badge>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors rounded">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setPendingDelete(r.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit subscription" : "Add subscription"}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Service / Merchant</label>
            <Input
              placeholder="e.g. Netflix"
              value={form.merchant}
              onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Amount</label>
              <Input
                type="number"
                placeholder="9.99"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Frequency</label>
              <select
                value={form.frequency}
                onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Last charged</label>
              <input
                type="date"
                value={form.last_seen}
                onChange={e => setForm(f => ({ ...f, last_seen: e.target.value }))}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={save}
              disabled={saving || !form.merchant.trim() || !form.amount}
              className="flex-1"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save changes" : "Add subscription"}
            </Button>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title="Remove subscription?"
        message="This subscription will be permanently removed from your list."
      />
    </div>
  )
}
