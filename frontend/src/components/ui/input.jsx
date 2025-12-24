import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, onFocus, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      onFocus={(e) => {
        // Close any open select dropdowns first by clicking away
        const openSelect = document.querySelector('[data-radix-select-content]');
        if (openSelect) {
          // Blur to close dropdown first, then refocus after a tick
          e.target.blur();
          setTimeout(() => {
            e.target.focus();
          }, 50);
          return;
        }
        if (onFocus) onFocus(e);
      }}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input }
