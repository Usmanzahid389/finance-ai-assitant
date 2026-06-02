export interface Transaction {
  id: string
  user_id: string
  date: string
  description: string
  amount: number
  category: string
  merchant: string | null
  currency: string
  is_income: boolean
  source: "csv" | "bank" | "receipt" | "manual"
  receipt_url: string | null
  created_at: string
}

export interface MonthlySummary {
  id: string
  user_id: string
  year: number
  month: number
  total_spent: number
  total_income: number
  category_breakdown: Record<string, number>
  transaction_count: number
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  limit_amount: number
  period: "monthly" | "weekly" | "yearly"
  created_at: string
}

export interface RecurringCharge {
  id: string
  user_id: string
  merchant: string
  amount: number
  frequency: "weekly" | "monthly" | "yearly"
  last_seen: string
  occurrences: number
  category: string
}

export interface UserContext {
  id: string
  user_id: string
  key: string
  value: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  attachments?: Attachment[]
  tool_calls?: ToolCall[]
  created_at?: string
}

export interface Attachment {
  type: "image" | "csv"
  url: string
  name: string
}

export interface ToolCall {
  name: string
  input: Record<string, unknown>
  result?: unknown
}

export type RequestType =
  | "sql_query"
  | "receipt_ocr"
  | "subscription_check"
  | "anomaly_check"
  | "budget_check"
  | "web_lookup"
  | "user_memory"
  | "general_reasoning"
  | "time_comparison"

export interface FinancialSnapshot {
  currentMonth: {
    spent: number
    income: number
    topCategories: Array<{ category: string; amount: number }>
  }
  lastMonth: {
    spent: number
    income: number
  }
  budgets: Array<Budget & { spent: number }>
  recurringCharges: RecurringCharge[]
}
