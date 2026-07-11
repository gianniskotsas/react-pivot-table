"use client"

// Radix build of the primitives shim. Keep the EXPORTED API identical to its
// base-ui twin, primitives.tsx — only the function body may differ. The
// divergence: PopoverButtonTrigger composes via `asChild` + a nested <Button>
// here; the base-ui build uses base-ui's `render` prop. This file is
// distribution-only: it is excluded from this repo's typecheck (tsconfig
// `**/*.radix.tsx`) and is never imported here — it is validated against real
// Radix primitives in a consumer project.

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

/** Radix build of the PopoverButtonTrigger shim — see primitives.tsx for the base-ui build. */
export function PopoverButtonTrigger({
  children,
  variant = "outline",
  size = "sm",
  className,
  ariaLabel,
}: PopoverButtonTriggerProps) {
  return (
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant={variant}
        size={size}
        aria-label={ariaLabel}
        className={className}
      >
        {children}
      </Button>
    </PopoverTrigger>
  )
}
