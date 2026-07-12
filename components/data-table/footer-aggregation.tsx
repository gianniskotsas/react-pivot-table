"use client"

import type { Column, Table } from "@tanstack/react-table"
import { Loader2 } from "lucide-react"
import * as React from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TableCell, TableFooter, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { AGGREGATION_METHOD_LABELS, ALL_AGGREGATION_METHODS } from "./aggregate"
import type { FooterAggregationResult } from "./use-footer-aggregation"
import type { AggregationMethod, DataTableColumnMeta } from "./types"

function formatValue(value: number): string {
  if (Number.isNaN(value)) return "—"
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
}

function FooterMethodPicker({
  columnLabel,
  method,
  onPick,
}: {
  columnLabel: string
  method: AggregationMethod | null
  onPick: (method: AggregationMethod | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(p) => (
          <button
            {...p}
            type="button"
            aria-label={`${columnLabel} aggregation: ${method ? AGGREGATION_METHOD_LABELS[method] : "off"}`}
            className="rounded-sm px-1.5 py-0.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          />
        )}
      >
        {method ? AGGREGATION_METHOD_LABELS[method] : "—"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-36 p-1">
        <button
          type="button"
          className={cn(
            "w-full rounded-sm px-2 py-1 text-left text-sm hover:bg-muted",
            method === null && "font-medium",
          )}
          onClick={() => {
            onPick(null)
            setOpen(false)
          }}
        >
          None
        </button>
        {ALL_AGGREGATION_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            className={cn(
              "w-full rounded-sm px-2 py-1 text-left text-sm hover:bg-muted",
              method === m && "font-medium",
            )}
            onClick={() => {
              onPick(m)
              setOpen(false)
            }}
          >
            {AGGREGATION_METHOD_LABELS[m]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function FooterValueCell<TData>({
  column,
  aggregation,
}: {
  column: Column<TData, unknown>
  aggregation: FooterAggregationResult
}) {
  const isCalculable = aggregation.methods[column.id] !== undefined
  if (!isCalculable) return <TableCell className="p-0" />

  const method = aggregation.methods[column.id] ?? null
  const state = aggregation.stateFor(column.id)
  const columnLabel = (column.columnDef.meta as DataTableColumnMeta | undefined)?.label ?? column.id

  return (
    <TableCell className="p-0 align-middle">
      <div className="flex items-center justify-between gap-1 px-1 py-1">
        <FooterMethodPicker
          columnLabel={columnLabel}
          method={method}
          onPick={(m) => aggregation.setMethod(column.id, m)}
        />
        {method && state ? (
          <span className="truncate text-right text-xs tabular-nums text-muted-foreground">
            {state.status === "idle" ? (
              <button
                type="button"
                className="underline"
                onClick={() => aggregation.calculate(column.id)}
              >
                Calculate
              </button>
            ) : state.status === "loading" ? (
              <Loader2 className="ml-auto size-3 animate-spin" aria-label="Calculating" />
            ) : state.status === "error" ? (
              <button
                type="button"
                className="text-destructive underline"
                onClick={() => aggregation.calculate(column.id)}
              >
                Retry
              </button>
            ) : (
              <>
                {formatValue(state.value)}
                {state.partial ? <span className="ml-1 opacity-70">(loaded rows)</span> : null}
                {state.status === "stale" ? (
                  <button
                    type="button"
                    className="ml-1 underline"
                    onClick={() => aggregation.calculate(column.id)}
                  >
                    refresh
                  </button>
                ) : null}
              </>
            )}
          </span>
        ) : null}
      </div>
    </TableCell>
  )
}

export function DataTableFooter<TData>({
  table,
  aggregation,
}: {
  table: Table<TData>
  aggregation: FooterAggregationResult
}) {
  const hasAnyCalculable = Object.keys(aggregation.methods).length > 0
  if (!hasAnyCalculable) return null

  return (
    <TableFooter>
      <TableRow>
        {table.getVisibleLeafColumns().map((column) => (
          <FooterValueCell key={column.id} column={column} aggregation={aggregation} />
        ))}
      </TableRow>
    </TableFooter>
  )
}
