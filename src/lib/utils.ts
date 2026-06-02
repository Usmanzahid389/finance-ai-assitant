import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

export function formatMonth(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(date))
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + "…" : str
}

export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    groceries: "#10b981",
    food: "#10b981",
    dining: "#f59e0b",
    restaurants: "#f59e0b",
    transport: "#3b82f6",
    transportation: "#3b82f6",
    entertainment: "#8b5cf6",
    shopping: "#ec4899",
    utilities: "#64748b",
    health: "#ef4444",
    healthcare: "#ef4444",
    travel: "#06b6d4",
    education: "#f97316",
    subscriptions: "#a78bfa",
    rent: "#94a3b8",
    housing: "#94a3b8",
    income: "#10b981",
    salary: "#10b981",
  }
  const key = category.toLowerCase()
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v
  }
  return "#64748b"
}
