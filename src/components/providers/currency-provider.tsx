"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface CurrencyContextValue {
  currency: string
  setCurrency: (c: string) => void
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  setCurrency: () => {},
})

export function CurrencyProvider({
  children,
  initialCurrency = "USD",
}: {
  children: React.ReactNode
  initialCurrency?: string
}) {
  const [currency, setCurrencyState] = useState(initialCurrency)

  async function setCurrency(c: string) {
    setCurrencyState(c)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("user_context").upsert(
      { user_id: user.id, key: "currency", value: c, updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" }
    )
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
