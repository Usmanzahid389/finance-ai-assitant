import Anthropic from "@anthropic-ai/sdk"

export const FINANCE_TOOLS: Anthropic.Tool[] = [
  {
    name: "query_transactions",
    description:
      "Run a structured query against the user's transactions. Use for: spending totals by category/time, largest purchases, merchant lookups, income queries. Always filter by user_id (handled server-side). Returns rows.",
    input_schema: {
      type: "object" as const,
      properties: {
        filters: {
          type: "object",
          description: "Query filters to apply",
          properties: {
            date_from: { type: "string", description: "ISO date string YYYY-MM-DD" },
            date_to: { type: "string", description: "ISO date string YYYY-MM-DD" },
            category: { type: "string", description: "Category name (partial match ok)" },
            merchant: { type: "string", description: "Merchant name (partial match ok)" },
            min_amount: { type: "number" },
            max_amount: { type: "number" },
            is_income: { type: "boolean" },
            limit: { type: "number", description: "Max rows to return, default 20" },
          },
        },
        aggregate: {
          type: "string",
          enum: ["none", "sum_by_category", "sum_by_month", "sum_by_merchant", "daily_totals"],
          description: "Aggregation mode. none = raw rows",
        },
      },
      required: ["filters", "aggregate"],
    },
  },
  {
    name: "get_monthly_summaries",
    description:
      "Retrieve pre-aggregated monthly spending summaries. Much cheaper than scanning raw transactions. Use for: month-over-month comparisons, yearly overviews, trend analysis. Returns total_spent, total_income, category_breakdown per month.",
    input_schema: {
      type: "object" as const,
      properties: {
        months_back: {
          type: "number",
          description: "How many months of history to retrieve (e.g. 6, 12, 24)",
        },
        specific_months: {
          type: "array",
          items: {
            type: "object",
            properties: {
              year: { type: "number" },
              month: { type: "number" },
            },
          },
          description: "Specific year/month pairs to retrieve instead of months_back",
        },
      },
      required: [],
    },
  },
  {
    name: "get_budget_status",
    description:
      "Get all budgets for the user along with actual spending for the current period. Use when user asks about budgets, whether they are on track, or close to limits.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_recurring_charges",
    description:
      "Get the list of detected recurring/subscription charges. Use when user asks about subscriptions, recurring payments, or wants to find forgotten charges.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_user_context",
    description:
      "Retrieve stored user preferences and context (e.g. pay date, budget exclusions, financial goals). Always call this at the start of a conversation if user preferences might be relevant.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "save_user_context",
    description:
      "Save a user preference or fact about their financial situation. Use when user states something like 'I get paid on the 1st', 'don't count rent in my food budget', 'my savings goal is $10k'.",
    input_schema: {
      type: "object" as const,
      properties: {
        key: { type: "string", description: "Preference key (e.g. pay_date, food_budget_exclusions, savings_goal)" },
        value: { type: "string", description: "The value to store" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the web to identify an unknown merchant or charge. Use when user doesn't recognise a transaction and wants to know what it is.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query, e.g. 'what is AMZN MKTP US charge'" },
      },
      required: ["query"],
    },
  },
  {
    name: "set_budget",
    description: "Create or update a budget for a spending category.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: { type: "string" },
        limit_amount: { type: "number" },
        period: { type: "string", enum: ["weekly", "monthly", "yearly"] },
      },
      required: ["category", "limit_amount", "period"],
    },
  },
  {
    name: "flag_anomaly",
    description:
      "Called internally when the assistant detects unusual spending. Presents the anomaly to the user with context.",
    input_schema: {
      type: "object" as const,
      properties: {
        transaction_description: { type: "string" },
        amount: { type: "number" },
        reason: { type: "string", description: "Why this looks unusual" },
      },
      required: ["transaction_description", "amount", "reason"],
    },
  },
]
