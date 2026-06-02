const CATEGORY_RULES: Array<{ patterns: RegExp[]; category: string; isIncome?: boolean }> = [
  { patterns: [/salary|payroll|direct.?dep|paycheck|wages/i], category: "Income", isIncome: true },
  { patterns: [/refund|cashback|reward/i], category: "Refunds", isIncome: true },
  { patterns: [/grocery|groceries|whole.?foods|trader.?joe|kroger|safeway|albertson|aldi|publix|sprouts|market/i], category: "Groceries" },
  { patterns: [/restaurant|dining|cafe|coffee|starbucks|mcdonald|burger|pizza|chipotle|subway|doordash|grubhub|ubereats|instacart/i], category: "Dining" },
  { patterns: [/uber|lyft|taxi|transit|metro|bart|mta|parking|gas.?station|shell|chevron|bp.?gas|exxon|fuel/i], category: "Transport" },
  { patterns: [/netflix|hulu|spotify|apple.?music|disney|hbo|amazon.?prime|youtube.?premium|audible|kindle|adobe|microsoft|google.?play|app.?store/i], category: "Subscriptions" },
  { patterns: [/amazon|walmart|target|bestbuy|ebay|etsy|shopify|aliexpress|costco/i], category: "Shopping" },
  { patterns: [/electric|water|internet|cable|phone|at.?t|verizon|t.?mobile|comcast|pg&e|utility/i], category: "Utilities" },
  { patterns: [/rent|mortgage|lease|landlord/i], category: "Housing" },
  { patterns: [/hospital|doctor|clinic|pharmacy|cvs|walgreens|health|dental|vision|insurance/i], category: "Healthcare" },
  { patterns: [/gym|fitness|planet.?fitness|equinox|yoga|crossfit/i], category: "Fitness" },
  { patterns: [/airline|flight|hotel|airbnb|booking|expedia|travel|vacation/i], category: "Travel" },
  { patterns: [/tuition|school|university|udemy|coursera|education/i], category: "Education" },
  { patterns: [/atm|cash.?withdrawal|withdrawal/i], category: "Cash" },
  { patterns: [/transfer|zelle|venmo|paypal|cashapp/i], category: "Transfers" },
]

export function categorizeTransaction(description: string): { category: string; isIncome: boolean } {
  const desc = description.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some(p => p.test(desc))) {
      return { category: rule.category, isIncome: rule.isIncome ?? false }
    }
  }
  return { category: "Other", isIncome: false }
}

export function inferMerchant(description: string): string {
  return description
    .replace(/\*.*$/, "")
    .replace(/\s+\d{4,}.*$/, "")
    .replace(/pos\s+|purchase\s+|payment\s+to\s+/i, "")
    .trim()
    .slice(0, 50)
}

export function parseAmount(raw: string): { amount: number; isIncome: boolean } {
  const str = String(raw).replace(/[$,\s]/g, "")
  const num = parseFloat(str)
  if (isNaN(num)) return { amount: 0, isIncome: false }
  return { amount: Math.abs(num), isIncome: num > 0 }
}

export function parseDate(raw: string): string | null {
  if (!raw) return null
  const cleaned = raw.trim()
  const attempts = [
    new Date(cleaned),
    new Date(cleaned.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$1-$2")),
    new Date(cleaned.replace(/(\d{2})-(\d{2})-(\d{4})/, "$3-$1-$2")),
  ]
  for (const d of attempts) {
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  return null
}
