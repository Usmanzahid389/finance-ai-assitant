"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Loader2, Tag, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
  color: string
}

const PRESET_COLORS = [
  "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899",
  "#ef4444", "#06b6d4", "#f97316", "#a78bfa", "#64748b",
  "#22c55e", "#94a3b8",
]

const DEFAULT_CATEGORIES = [
  { name: "Groceries", color: "#10b981" },
  { name: "Dining", color: "#f59e0b" },
  { name: "Transport", color: "#3b82f6" },
  { name: "Shopping", color: "#ec4899" },
  { name: "Entertainment", color: "#8b5cf6" },
  { name: "Healthcare", color: "#ef4444" },
  { name: "Utilities", color: "#64748b" },
  { name: "Subscriptions", color: "#a78bfa" },
  { name: "Travel", color: "#06b6d4" },
  { name: "Education", color: "#f97316" },
  { name: "Housing", color: "#94a3b8" },
  { name: "Income", color: "#22c55e" },
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name")

    setCategories(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setName("")
    setColor(PRESET_COLORS[0])
    setModalOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setName(cat.name)
    setColor(cat.color)
    setModalOpen(true)
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editing) {
      const { error } = await supabase
        .from("categories")
        .update({ name: name.trim(), color })
        .eq("id", editing.id)
      if (error) { toast.error("Failed to update"); setSaving(false); return }
      toast.success("Category updated")
    } else {
      const { error } = await supabase
        .from("categories")
        .insert({ user_id: user.id, name: name.trim(), color })
      if (error) {
        toast.error(error.message.includes("unique") ? "Category already exists" : "Failed to save")
        setSaving(false)
        return
      }
      toast.success("Category added")
    }

    setSaving(false)
    setModalOpen(false)
    load()
  }

  async function remove(id: string) {
    const { error } = await supabase.from("categories").delete().eq("id", id)
    if (error) { toast.error("Failed to delete"); return }
    toast.success("Category removed")
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  async function seedDefaults() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const rows = DEFAULT_CATEGORIES.map(c => ({ user_id: user.id, ...c }))
    const { error } = await supabase.from("categories").upsert(rows, { onConflict: "user_id,name" })
    if (error) { toast.error("Failed to seed categories"); return }
    toast.success("Default categories added")
    load()
  }

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
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">Categories</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{categories.length} categories</p>
          </div>
          <Button onClick={openAdd} size="sm">
            <Plus className="w-3.5 h-3.5" />Add
          </Button>
        </div>

        {categories.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center border border-dashed border-slate-700">
            <Tag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h2 className="text-slate-700 dark:text-slate-300 font-medium mb-1">No categories yet</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Add your own or start with defaults</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={seedDefaults}>Add defaults</Button>
              <Button size="sm" onClick={openAdd}>Add custom</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="glass rounded-xl overflow-hidden">
              <AnimatePresence initial={false}>
                {categories.map(cat => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 last:border-0 group"
                  >
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ background: cat.color }} />
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{cat.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(cat)} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setPendingDelete(cat.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <Button variant="outline" size="sm" onClick={seedDefaults} className="w-full">
              Add default categories
            </Button>
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit category" : "New category"}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Name</label>
            <Input
              placeholder="e.g. Groceries"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save() }}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c,
                    outline: color === c ? `2px solid ${c}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50">
            <div className="w-4 h-4 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-sm text-slate-700 dark:text-slate-300">{name || "Preview"}</span>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={save} disabled={saving || !name.trim()} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save changes" : "Add category"}
            </Button>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title="Delete category?"
        message="This category will be permanently deleted. Existing transactions using it will keep their category name."
      />
    </div>
  )
}
