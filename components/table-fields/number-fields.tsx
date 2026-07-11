import type * as React from "react"
import type { CellContext } from "@tanstack/react-table"

import { formatCurrency, formatDuration, formatNumber, formatPercent } from "./format"
import { FIELD_ICONS } from "./icons"
import type { FieldType } from "./types"

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
    toClipboard: toClipboardNumber,
    fromClipboard: parseNumeric,
  }
}

export function durationField(
  opts: { unit?: "minutes" | "hms" } = {},
): FieldType<number> {
  return {
    name: "duration",
    icon: FIELD_ICONS.duration,
    align: "right",
    display: (ctx) => (
      <span className="tabular-nums">{formatDuration(ctx.getValue(), opts)}</span>
    ),
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
