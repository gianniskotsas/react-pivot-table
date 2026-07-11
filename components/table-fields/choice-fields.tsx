import type * as React from "react"
import type { CellContext } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"

import { FIELD_ICONS } from "./icons"
import type { FieldType, SelectOption } from "./types"

function labelFor(options: SelectOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value
}

export function singleSelectField(opts: { options: SelectOption[] }): FieldType<string> {
  return {
    name: "singleSelect",
    icon: FIELD_ICONS.singleSelect,
    display: (ctx) => {
      const v = ctx.getValue()
      return v ? <Badge variant="secondary">{labelFor(opts.options, v)}</Badge> : null
    },
    toClipboard: (v) => v ?? "",
    fromClipboard: (t) => t,
  }
}

/**
 * Clipboard format is a human-readable, Excel-pasteable comma-joined list
 * (matching Airtable). Consequence: option `value`s must not contain a comma,
 * or the copy/paste round-trip splits them apart. Keep values comma-free
 * (labels may contain commas; only the serialized `value` is affected).
 */
export function multiSelectField(opts: { options: SelectOption[] }): FieldType<string[]> {
  return {
    name: "multiSelect",
    icon: FIELD_ICONS.multiSelect,
    display: (ctx) => {
      const values = ctx.getValue() ?? []
      return (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary">
              {labelFor(opts.options, v)}
            </Badge>
          ))}
        </div>
      )
    },
    toClipboard: (values) => (values ?? []).join(", "),
    fromClipboard: (t) =>
      t
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
  }
}

export function checkboxField(): FieldType<boolean> {
  return {
    name: "checkbox",
    icon: FIELD_ICONS.checkbox,
    align: "center",
    display: (ctx) => (ctx.getValue() ? <span aria-label="checked">✓</span> : null),
    toClipboard: (v) => (v ? "true" : "false"),
    fromClipboard: (t) => t.trim().toLowerCase() === "true",
  }
}

export const singleSelectCell = <TData,>(o: { options: SelectOption[] }) =>
  singleSelectField(o).display as (ctx: CellContext<TData, string>) => React.ReactNode
export const multiSelectCell = <TData,>(o: { options: SelectOption[] }) =>
  multiSelectField(o).display as (ctx: CellContext<TData, string[]>) => React.ReactNode
export const checkboxCell = <TData,>() =>
  checkboxField().display as (ctx: CellContext<TData, boolean>) => React.ReactNode
