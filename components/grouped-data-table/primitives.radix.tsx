"use client"

// Radix build of the primitives shim. Keep the EXPORTED API identical to its
// base-ui twin, primitives.tsx — only the function bodies may differ. The
// divergences between the two files are exactly:
//   1. <Select> omits the `items` prop here; the base-ui build requires it.
//   2. Radix `onValueChange` is `(value: string) => void` (non-nullable), so no
//      guard here; the base-ui build guards `v != null`.
//   3. PopoverButtonTrigger composes via `asChild` + a nested <Button> here; the
//      base-ui build uses base-ui's `render` prop.
// This file is distribution-only: it is excluded from this repo's typecheck
// (tsconfig `**/*.radix.tsx`) and is never imported here — it is validated
// against real Radix primitives in a consumer project.

import * as React from "react"

import { Button } from "@/components/ui/button"
import { PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SelectOption = { value: string; label: string }

export type FieldSelectProps = {
  value: string
  items: SelectOption[]
  onValueChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
  size?: "sm" | "default"
  className?: string
}

/** Radix build of the FieldSelect shim — see primitives.tsx for the base-ui build. */
export function FieldSelect({
  value,
  items,
  onValueChange,
  ariaLabel,
  placeholder,
  size = "sm",
  className,
}: FieldSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(String(v))}>
      <SelectTrigger aria-label={ariaLabel} size={size} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export type PopoverButtonTriggerProps = {
  children: React.ReactNode
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
  ariaLabel?: string
  disabled?: boolean
}

/** Radix build of the PopoverButtonTrigger shim — see primitives.tsx for the base-ui build. */
export function PopoverButtonTrigger({
  children,
  variant = "outline",
  size = "sm",
  className,
  ariaLabel,
  disabled,
}: PopoverButtonTriggerProps) {
  return (
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant={variant}
        size={size}
        aria-label={ariaLabel}
        className={className}
        disabled={disabled}
      >
        {children}
      </Button>
    </PopoverTrigger>
  )
}
