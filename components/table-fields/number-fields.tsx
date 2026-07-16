import type * as React from "react"
import type { CellContext } from "@tanstack/react-table"

import { Input } from "@/components/ui/input"

import { formatCurrency, formatDuration, formatNumber, formatPercent } from "./format"
import { FIELD_ICONS } from "./icons"
import type { FieldEditContext, FieldType } from "./types"

/** Parse a possibly-formatted numeric string (e.g. "$1,000.00") to a number. */
function parseNumeric(text: string): number | undefined {
  const cleaned = text.replace(/[^0-9.-]/g, "")
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return undefined
  const n = Number(cleaned)
  return Number.isNaN(n) ? undefined : n
}

function toClipboardNumber(value: number): string {
  return value == null || Number.isNaN(value) ? "" : String(value)
}

/**
 * Shared numeric edit renderer for number/currency/percent/duration.
 *
 * Controlled by ctx.value: a lone "-" or trailing "." never round-trips
 * through this at all — native `type="number"` inputs withhold the change
 * event entirely for an incomplete/invalid value (per the WHATWG value
 * sanitization algorithm), so onChange only ever fires with "" or a fully
 * parseable number. Controlled is required so re-entering edit mode on the
 * same cell (after a commit/cancel) reflects the fresh `ctx.value` instead of
 * stale DOM content from a prior edit session.
 */
function numericEdit(ctx: FieldEditContext<number>) {
  return (
    <Input
      type="number"
      autoFocus
      value={Number.isNaN(ctx.value) ? "" : ctx.value}
      onChange={(e) => ctx.setValue(e.target.value === "" ? Number.NaN : Number(e.target.value))}
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
      className="h-8"
    />
  )
}

export function numberField(
  opts: { locale?: string; maximumFractionDigits?: number } = {},
): FieldType<number> {
  return {
    name: "number",
    icon: FIELD_ICONS.number,
    align: "right",
    display: (ctx) => (
      <span className="tabular-nums">{formatNumber(ctx.getValue(), opts)}</span>
    ),
    edit: numericEdit,
    toClipboard: toClipboardNumber,
    fromClipboard: parseNumeric,
  }
}

export function currencyField(
  opts: { currency?: string; locale?: string } = {},
): FieldType<number> {
  return {
    name: "currency",
    icon: FIELD_ICONS.currency,
    align: "right",
    display: (ctx) => (
      <span className="tabular-nums">{formatCurrency(ctx.getValue(), opts)}</span>
    ),
    edit: numericEdit,
    toClipboard: toClipboardNumber,
    fromClipboard: parseNumeric,
  }
}

export function percentField(
  opts: { locale?: string; maximumFractionDigits?: number } = {},
): FieldType<number> {
  return {
    name: "percent",
    icon: FIELD_ICONS.percent,
    align: "right",
    display: (ctx) => (
      <span className="tabular-nums">{formatPercent(ctx.getValue(), opts)}</span>
    ),
    edit: numericEdit,
    // Percent stores a FRACTION of 1 (0.42 renders "42%" via Intl's percent
    // style), but spreadsheets serialize percent cells as "42%" — so unlike
    // the other numeric fields, the clipboard boundary must convert. Copy
    // emits the display form ("42%", float noise stripped via toPrecision so
    // 0.1 doesn't leak out as "10.000000000000002%"); paste divides by 100
    // when a % is present and otherwise takes the number as the raw fraction,
    // which keeps our own copy→paste round-trip exact AND fixes Excel/Sheets
    // pastes that previously landed 100× too large (a "42%" cell stored 42
    // and rendered "4,200%").
    toClipboard: (value) =>
      value == null || Number.isNaN(value)
        ? ""
        : `${Number((value * 100).toPrecision(12))}%`,
    fromClipboard: (text) => {
      const n = parseNumeric(text)
      if (n === undefined) return undefined
      return text.includes("%") ? n / 100 : n
    },
  }
}

export function durationField(
  opts: { unit?: "s" | "ms"; maxUnits?: number } = {},
): FieldType<number> {
  return {
    name: "duration",
    icon: FIELD_ICONS.duration,
    align: "right",
    display: (ctx) => (
      <span className="tabular-nums">{formatDuration(ctx.getValue(), opts)}</span>
    ),
    edit: numericEdit,
    toClipboard: toClipboardNumber,
    fromClipboard: parseNumeric,
  }
}

// Standalone ColumnDef["cell"] factories — display renderers, for any table.
export const numberCell = <TData,>(o?: Parameters<typeof numberField>[0]) => {
  const f = numberField(o)
  return (ctx: CellContext<TData, unknown>) => f.display(ctx as CellContext<unknown, number>)
}
export const currencyCell = <TData,>(o?: Parameters<typeof currencyField>[0]) => {
  const f = currencyField(o)
  return (ctx: CellContext<TData, unknown>) => f.display(ctx as CellContext<unknown, number>)
}
export const percentCell = <TData,>(o?: Parameters<typeof percentField>[0]) => {
  const f = percentField(o)
  return (ctx: CellContext<TData, unknown>) => f.display(ctx as CellContext<unknown, number>)
}
export const durationCell = <TData,>(o?: Parameters<typeof durationField>[0]) => {
  const f = durationField(o)
  return (ctx: CellContext<TData, unknown>) => f.display(ctx as CellContext<unknown, number>)
}
