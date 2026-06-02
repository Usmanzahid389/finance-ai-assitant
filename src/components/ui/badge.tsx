import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400",
        secondary: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600/30",
        destructive: "bg-red-500/10 text-red-600 border border-red-500/20 dark:text-red-400",
        warning: "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400",
        blue: "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400",
        violet: "bg-violet-500/10 text-violet-600 border border-violet-500/20 dark:text-violet-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
