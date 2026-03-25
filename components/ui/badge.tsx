import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-red focus-visible:ring-offset-1",
  {
    variants: {
      variant: {
        default: "border-ink/15 bg-surface-0 text-ink-strong",
        secondary: "border-transparent bg-surface-1 text-ink",
        accent: "border-accent-red bg-accent-red text-white",
        destructive:
          "border-status-error/40 bg-status-error/10 text-status-error",
        outline: "border-ink text-ink bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
