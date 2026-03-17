import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-[#e8d5e5]/50 text-[#4a3c58]",
      success: "bg-[#fdfcf5] text-[#b1a1c6] border border-[#b1a1c6]/20",
      warning: "bg-[#f2e6b1]/40 text-[#4a3c58]",
      danger: "bg-rose-100 text-rose-700",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
