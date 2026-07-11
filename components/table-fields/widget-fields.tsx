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
    edit: (ctx) => (
      <div
        className="flex items-center gap-0.5"
        onKeyDown={(e) => {
          // Tab bubbles up here from whichever star button has focus — one
          // handler covers the whole widget. Rating commits synchronously on
          // click (no "draft" value), so Escape has nothing to revert but is
          // still handled for consistency: it exits edit mode without a click.
          e.stopPropagation()
          if (e.key === "Escape") {
            e.preventDefault()
            ctx.cancel()
          } else if (e.key === "Tab") {
            e.preventDefault()
            ctx.focusNext(e.shiftKey ? "prev" : "next")
          }
        }}
      >
        {Array.from({ length: max }, (_, i) => {
          const filled = i < (ctx.value ?? 0)
          return (
            <button
              key={i}
              type="button"
              aria-label={`Rate ${i + 1}`}
              onClick={() => {
                ctx.setValue(i + 1)
                ctx.commit()
              }}
              className="cursor-pointer"
            >
              <Star
                className={cn(
                  "size-4",
                  filled ? "fill-current text-amber-500" : "text-muted-foreground/40",
                )}
              />
            </button>
          )
        })}
      </div>
    ),
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
    edit: (ctx) => {
      const d = toDate(ctx.value)
      const iso = d ? d.toISOString().slice(0, 10) : ""
      return (
        <input
          type="date"
          autoFocus
          value={iso}
          onChange={(e) => ctx.setValue(e.target.value)}
          onBlur={ctx.commit}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === "Enter") {
              e.preventDefault()
              ctx.commit()
              ctx.focusNext("down")
            } else if (e.key === "Escape") {
              e.preventDefault()
              ctx.cancel()
            } else if (e.key === "Tab") {
              e.preventDefault()
              ctx.commit()
              ctx.focusNext(e.shiftKey ? "prev" : "next")
            }
          }}
          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
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
