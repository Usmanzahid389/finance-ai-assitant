"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import {
  TrendingUp, MessageSquare, LayoutDashboard, Upload,
  Settings, LogOut, Wallet, Target, RefreshCw, Sun, Moon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const nav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/chat", icon: MessageSquare, label: "Assistant" },
  { href: "/dashboard/transactions", icon: Wallet, label: "Transactions" },
  { href: "/dashboard/budgets", icon: Target, label: "Budgets" },
  { href: "/dashboard/import", icon: Upload, label: "Import" },
  { href: "/dashboard/subscriptions", icon: RefreshCw, label: "Subscriptions" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("Signed out")
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <aside className="w-56 shrink-0 h-full flex flex-col border-r"
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--glass-border)", backdropFilter: "blur(16px)" }}>
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: "var(--glass-border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>FinanceAI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}>
              <motion.div
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer group",
                  active
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                )}
                style={!active ? { color: "var(--text-secondary)" } : {}}
              >
                <Icon className={cn("w-4 h-4 shrink-0", active ? "text-emerald-500" : "")}
                  style={!active ? { color: "var(--text-muted)" } : {}} />
                {label}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 space-y-0.5 border-t" style={{ borderColor: "var(--glass-border)" }}>
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: "var(--text-secondary)" }}
        >
          {theme === "dark"
            ? <Sun className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            : <Moon className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          }
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        <Link href="/dashboard/settings">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}>
            <Settings className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            Settings
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-red-500/5 hover:text-red-500"
          style={{ color: "var(--text-secondary)" }}
        >
          <LogOut className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
