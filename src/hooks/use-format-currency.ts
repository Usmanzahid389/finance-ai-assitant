"use client"

import { useCurrency } from "@/components/providers/currency-provider"

export function useFormatCurrency() {
  const { currency } = useCurrency()
  return (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
}
