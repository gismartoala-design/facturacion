import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-[#e8d5e5] bg-[#fdfcf5] px-3 py-2 text-sm text-[#4a3c58] placeholder:text-[#4a3c58]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b1a1c6] transition-all",
        className,
      )}
      {...props}
    />
  );
}
