"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { useFormatCurrency } from "@/hooks/use-format-currency"

interface Props {
  data: Array<{ name: string; value: number; fill: string }>
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) {
  const formatCurrency = useFormatCurrency()
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs" style={{ border: "1px solid var(--glass-border)" }}>
      <p className="font-medium" style={{ color: "var(--text-primary)" }}>{name}</p>
      <p className="text-emerald-400">{formatCurrency(value)}</p>
    </div>
  )
}

export function SpendingChart({ data }: Props) {
  if (!data.length) return (
    <div className="h-40 flex items-center justify-center text-slate-600 text-sm">
      No spending data
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} opacity={0.9} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
