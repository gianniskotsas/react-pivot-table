"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"

import { aggregate } from "./aggregate"
import type {
  AggregateCellState,
  AggregationMethod,
  CalculableColumn,
  ComputeAggregateArgs,
} from "./types"

export type UseFooterAggregationOptions<TData> = {
  table: Table<TData>
  calculableColumns?: CalculableColumn[]
  computeAggregate?: (args: ComputeAggregateArgs) => Promise<number>
  manualPagination?: boolean
  totalRowCount?: number
  isAllMatchingSelected: boolean
}

export type FooterAggregationResult = {
  /** Live method per calculable column; null means "off" (no footer value shown). */
  methods: Record<string, AggregationMethod | null>
  setMethod: (columnId: string, method: AggregationMethod | null) => void
  /** Resolved display state for a column's current method, or undefined if the column isn't calculable or its method is off. */
  stateFor: (columnId: string) => AggregateCellState | undefined
  /** True when the footer is summarizing a selection rather than all visible rows. */
  scopeIsSelection: boolean
  /** Re-requests a server value for a column currently showing a "Calculate" trigger (idle) or a stale value. No-op until Task 5 wires computeAggregate. */
  calculate: (columnId: string) => void
}

export function useFooterAggregation<TData>({
  table,
  calculableColumns = [],
  isAllMatchingSelected,
}: UseFooterAggregationOptions<TData>): FooterAggregationResult {
  const columnConfig = React.useMemo(() => {
    const map = new Map<string, CalculableColumn>()
    for (const c of calculableColumns) map.set(c.columnId, c)
    return map
  }, [calculableColumns])

  const [methods, setMethods] = React.useState<Record<string, AggregationMethod | null>>(() => {
    const initial: Record<string, AggregationMethod | null> = {}
    for (const c of calculableColumns) initial[c.columnId] = c.default ?? null
    return initial
  })

  const setMethod = React.useCallback((columnId: string, method: AggregationMethod | null) => {
    setMethods((prev) => ({ ...prev, [columnId]: method }))
  }, [])

  const selectedRows = table.getSelectedRowModel().rows
  const scopeIsSelection = isAllMatchingSelected || selectedRows.length > 0
  const scopeRows = scopeIsSelection ? selectedRows : table.getSortedRowModel().rows

  const stateFor = React.useCallback(
    (columnId: string): AggregateCellState | undefined => {
      const method = methods[columnId]
      if (!columnConfig.has(columnId) || !method) return undefined
      const values = scopeRows.map((row) => row.getValue(columnId) as number | null | undefined)
      return { status: "value", value: aggregate(method, values) }
    },
    [methods, columnConfig, scopeRows],
  )

  const calculate = React.useCallback((_columnId: string) => {
    // No-op until Task 5 adds the hybrid client/server state machine.
  }, [])

  return { methods, setMethod, stateFor, scopeIsSelection, calculate }
}
