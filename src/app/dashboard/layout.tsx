import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CurrencyProvider } from "@/components/providers/currency-provider"
import { DashboardShell } from "@/components/layout/dashboard-shell"

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

  const initialCurrency =
    ctxRow?.value ??
    (user.user_metadata?.currency as string | undefined) ??
    "USD"

  return (
    <CurrencyProvider initialCurrency={initialCurrency}>
      <DashboardShell>
        {children}
      </DashboardShell>
    </CurrencyProvider>
  )
}
