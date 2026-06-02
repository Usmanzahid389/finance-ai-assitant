import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/sidebar"
import { CurrencyProvider } from "@/components/providers/currency-provider"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: ctxRow } = await supabase
    .from("user_context")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", "currency")
    .single()

  // Fallback chain: user_context → signup metadata → USD
  const initialCurrency =
    ctxRow?.value ??
    (user.user_metadata?.currency as string | undefined) ??
    "USD"

  return (
    <CurrencyProvider initialCurrency={initialCurrency}>
      <div className="h-screen flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </CurrencyProvider>
  )
}
