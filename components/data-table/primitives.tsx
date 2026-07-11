"use client"

// base-ui build of the primitives shim. Keep the EXPORTED API identical to its
// Radix twin, primitives.radix.tsx — only the function body may differ. The
// divergence: PopoverButtonTrigger composes via base-ui's `render` prop here;
// the Radix build uses `asChild` with a nested <Button>. If you change a prop
// name, type, or default below, mirror it in the twin.

import * as React from "react"

import { Button } from "@/components/ui/button"
import { PopoverTrigger } from "@/components/ui/popover"

export type PopoverButtonTriggerProps = {
  children: React.ReactNode
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
  ariaLabel?: string
}

/**
 * Popover trigger rendered as a Button, normalized across base-ui / Radix. The
 * base-ui build uses base-ui's `render` prop; the Radix build uses `asChild`.
 * Must be used inside a <Popover>.
 */
export function PopoverButtonTrigger({
  children,
  variant = "outline",
  size = "sm",
  className,
  ariaLabel,
}: PopoverButtonTriggerProps) {
  return (
    <PopoverTrigger
      render={(p) => (
        <Button
          {...p}
          type="button"
          variant={variant}
          size={size}
          aria-label={ariaLabel}
          className={className}
        />
      )}
    >
      {children}
    </PopoverTrigger>
  )
}
