import type * as React from "react"
import type { CellContext } from "@tanstack/react-table"
import { Star } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { FIELD_ICONS } from "./icons"
import type { FieldType } from "./types"

export function ratingField(opts: { max?: number } = {}): FieldType<number> {
  const max = opts.max ?? 5
  return {
    name: "rating",
    icon: FIELD_ICONS.rating,
    display: (ctx) => {
      const value = ctx.getValue() ?? 0
      return (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: max }, (_, i) => {
            const filled = i < value
            return (
              <Star
                key={i}
                data-star={filled ? "filled" : "empty"}
                className={cn(
                  "size-4",
                  filled ? "fill-current text-amber-500" : "text-muted-foreground/40",
                )}
              />
            )
          })}
        </div>
      )
    },
    toClipboard: (v) => (v == null ? "" : String(v)),
    fromClipboard: (t) => {
      const n = Number(t)
      if (Number.isNaN(n)) return undefined
      // Clamp to the field's [0, max] range so a pasted out-of-range value
      // can't desync the display (which caps at `max`) from the stored data.
      return Math.max(0, Math.min(max, n))
    },
  }
}

export function buttonField<TData = unknown>(opts: {
  label: string
  onClick: (row: TData) => void
}): FieldType<unknown> {
  return {
    name: "button",
    icon: FIELD_ICONS.button,
    display: (ctx) => (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          opts.onClick(ctx.row.original as TData)
        }}
      >
        {opts.label}
      </Button>
    ),
    toClipboard: () => "",
    fromClipboard: () => undefined,
  }
}

function toDate(value: Date | string): Date | undefined {
  if (value == null) return undefined
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function dateField(
  opts: { withTime?: boolean; locale?: string } = {},
): FieldType<Date | string> {
  return {
    name: "date",
    icon: FIELD_ICONS.date,
    display: (ctx) => {
      const d = toDate(ctx.getValue())
      if (!d) return null
      return (
        <span>
          {new Intl.DateTimeFormat(opts.locale ?? "en-US", {
            // Values are stored/round-tripped in UTC (ISO), so format in UTC too
            // — otherwise a plain date parsed as UTC midnight renders as the
            // previous day for viewers west of UTC.
            timeZone: "UTC",
            dateStyle: "medium",
            ...(opts.withTime ? { timeStyle: "short" } : {}),
          }).format(d)}
        </span>
      )
    },
    // Round-trips as an ISO date (yyyy-mm-dd) or full ISO when time is present.
    toClipboard: (v) => {
      const d = toDate(v)
      if (!d) return ""
      return opts.withTime ? d.toISOString() : d.toISOString().slice(0, 10)
    },
    fromClipboard: (t) => (toDate(t) ? t : undefined),
  }
}

export const ratingCell = <TData,>(o?: { max?: number }) => {
  const f = ratingField(o)
  return (ctx: CellContext<TData, unknown>) => f.display(ctx as CellContext<unknown, number>)
}
export const buttonCell = <TData,>(o: { label: string; onClick: (row: TData) => void }) => {
  const f = buttonField<TData>(o)
  return (ctx: CellContext<TData, unknown>) => f.display(ctx as CellContext<unknown, unknown>)
}
export const dateCell = <TData,>(o?: { withTime?: boolean; locale?: string }) => {
  const f = dateField(o)
  return (ctx: CellContext<TData, unknown>) => f.display(ctx as CellContext<unknown, Date | string>)
}
