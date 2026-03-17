import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b1a1c6]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-tr from-[#b1a1c6] to-[#4a3c58] text-white shadow-md hover:shadow-lg hover:from-[#a191b6] hover:to-[#3a2c48] border-0",
        secondary: "bg-white/80 border border-[#e8d5e5] text-[#4a3c58] shadow-sm hover:bg-white backdrop-blur-sm",
        outline: "border border-[#e8d5e5] bg-white/50 text-slate-700 shadow-sm hover:bg-white hover:border-[#b1a1c6] hover:text-[#4a3c58]",
        destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
