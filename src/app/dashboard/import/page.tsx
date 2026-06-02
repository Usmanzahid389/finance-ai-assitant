"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, CheckCircle2, AlertCircle, FileText, Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ImportResult {
  imported: number
  total_in_file: number
  skipped: number
  months_updated: number
  recurring_detected: number
}

export default function ImportPage() {
  const router = useRouter()
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file")
      return
    }
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const fd = new FormData()
      fd.append("file", file)

      const res = await fetch("/api/import", { method: "POST", body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Import failed")
        return
      }

      setResult(data)
      toast.success(`Imported ${data.imported} transactions`)
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function downloadSample() {
    const csv = `Date,Description,Amount,Category
2024-01-15,WHOLE FOODS MARKET,-87.43,Groceries
2024-01-16,NETFLIX,-15.99,Subscriptions
2024-01-17,SALARY PAYROLL,3500.00,Income
2024-01-18,UBER TRIP,-12.50,Transport
2024-01-19,STARBUCKS,-6.75,Dining
2024-01-20,AMAZON PRIME,-14.99,Subscriptions
2024-01-22,SPOTIFY,-9.99,Subscriptions
2024-01-23,SHELL GAS STATION,-45.00,Transport
2024-01-25,CVS PHARMACY,-23.45,Healthcare
2024-01-28,DOORDASH,-34.20,Dining
2024-02-01,SALARY PAYROLL,3500.00,Income
2024-02-03,WHOLE FOODS MARKET,-92.10,Groceries
2024-02-05,NETFLIX,-15.99,Subscriptions
2024-02-08,UBER TRIP,-8.40,Transport
2024-02-12,PLANET FITNESS,-24.99,Fitness
2024-02-15,AMAZON MKTP,-156.30,Shopping
2024-02-18,SPOTIFY,-9.99,Subscriptions
2024-02-20,ELECTRIC BILL,-87.00,Utilities
2024-02-22,CHIPOTLE,-14.75,Dining
2024-02-28,RENT PAYMENT,-1800.00,Housing`
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sample-transactions.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 mb-1">Import transactions</h1>
          <p className="text-sm text-slate-500">Upload a CSV export from your bank or financial app</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`
            relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-200
            ${dragging ? "border-emerald-500/60 bg-emerald-500/5" : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/30"}
          `}
        >
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />

          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <p className="text-sm text-slate-400">Processing your transactions…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${dragging ? "bg-emerald-500/20" : "bg-slate-800"}`}>
                <Upload className={`w-6 h-6 ${dragging ? "text-emerald-400" : "text-slate-500"}`} />
              </div>
              <div>
                <p className="text-sm text-slate-300 font-medium">
                  {dragging ? "Drop to upload" : "Drag & drop your CSV here"}
                </p>
                <p className="text-xs text-slate-600 mt-1">or click to browse</p>
              </div>
            </div>
          )}
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />Import complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Imported", value: result.imported, variant: "default" as const },
                      { label: "Skipped (dupes)", value: result.skipped, variant: "secondary" as const },
                      { label: "Months updated", value: result.months_updated, variant: "blue" as const },
                      { label: "Recurring found", value: result.recurring_detected, variant: "violet" as const },
                    ].map(s => (
                      <div key={s.label} className="glass rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                        <p className="text-xl font-bold text-slate-100">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => router.push("/dashboard")} className="flex-1">
                      View dashboard
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/dashboard/chat")} className="flex-1">
                      Ask AI
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex gap-3 glass rounded-xl p-4 border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Import failed</p>
                  <p className="text-xs text-slate-500 mt-0.5">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Supported formats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />CSV format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-400">
            <p>Supports exports from most banks. The file must have columns for:</p>
            <div className="flex flex-wrap gap-2">
              {["Date", "Description / Memo", "Amount"].map(f => (
                <Badge key={f} variant="secondary">{f}</Badge>
              ))}
            </div>
            <p className="text-xs text-slate-600">
              Duplicates are automatically detected and skipped. Messy data (missing fields, extra columns) is handled gracefully.
            </p>
            <button onClick={downloadSample} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              <Download className="w-3.5 h-3.5" />Download sample CSV
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
