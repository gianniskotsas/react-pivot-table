"use client"

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

/**
 * Single-select normalized across base-ui / Radix. The base-ui build passes the
 * required `items` prop to the Select root and guards the nullable onValueChange;
 * the Radix build (primitives.radix.tsx) omits `items`. Callers never touch the
 * primitive Select API directly, so the rest of the component is base-agnostic.
 */
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
    <Select
      value={value}
      items={items}
      onValueChange={(v) => v != null && onValueChange(String(v))}
    >
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
