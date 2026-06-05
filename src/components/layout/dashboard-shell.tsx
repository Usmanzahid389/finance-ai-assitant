"use client"

import { useState } from "react"
import { Menu, TrendingUp } from "lucide-react"
import { Sidebar } from "./sidebar"
import { usePathname } from "next/navigation"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/chat": "Assistant",
  "/dashboard/transactions": "Transactions",
  "/dashboard/budgets": "Budgets",
  "/dashboard/subscriptions": "Subscriptions",
  "/dashboard/categories": "Categories",
  "/dashboard/import": "Import",
  "/dashboard/settings": "Settings",
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? "FinanceAI"

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — hidden off-screen on mobile, always visible on lg+ */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 h-14 px-4 border-b shrink-0"
          style={{ background: "var(--sidebar-bg)", borderColor: "var(--glass-border)" }}>
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {title}
            </span>
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}
