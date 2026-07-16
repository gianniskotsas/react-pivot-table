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
  /** Re-requests a server value for a column currently showing a "Calculate" trigger (idle) or a stale value. */
  calculate: (columnId: string) => void
}

export function useFooterAggregation<TData>({
  table,
  calculableColumns = [],
  computeAggregate,
  manualPagination = false,
  totalRowCount,
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

  const loadedRowCount = table.getSortedRowModel().rows.length
  // Only the all-matching selection can ever exceed what's loaded — a
  // hand-picked selection of specific rows is, by definition, a selection of
  // rows the user could see (and therefore rows already loaded).
  const scopeExceedsLoaded =
    manualPagination &&
    totalRowCount !== undefined &&
    (scopeIsSelection ? isAllMatchingSelected : totalRowCount > loadedRowCount)

  const [serverStates, setServerStates] = React.useState<Record<string, AggregateCellState>>({})

  // If the user changes method/scope and re-triggers calculate() before an
  // earlier in-flight request for the same column has resolved, the two
  // promises race: whichever settles last would otherwise win, even if it's
  // the stale one. Each calculate() call bumps a per-column request id, and
  // its .then/.catch only commits state if that id is still the latest one
  // recorded for the column when the promise settles — otherwise a newer
  // request has already superseded it and the result is silently dropped.
  const requestIdRef = React.useRef<Record<string, number>>({})

  const calculate = React.useCallback(
    (columnId: string) => {
      const method = methods[columnId]
      if (!method || !computeAggregate) return
      const requestId = (requestIdRef.current[columnId] ?? 0) + 1
      requestIdRef.current[columnId] = requestId
      setServerStates((prev) => ({ ...prev, [columnId]: { status: "loading" } }))
      computeAggregate({
        columnId,
        method,
        scope: scopeIsSelection ? "selection-all-matching" : "all-matching",
      })
        .then((value) => {
          if (requestIdRef.current[columnId] !== requestId) return // superseded by a newer request
          setServerStates((prev) => ({ ...prev, [columnId]: { status: "value", value } }))
        })
        .catch((err: unknown) => {
          if (requestIdRef.current[columnId] !== requestId) return // superseded by a newer request
          const message = err instanceof Error ? err.message : "Failed to calculate"
          setServerStates((prev) => ({ ...prev, [columnId]: { status: "error", message } }))
        })
    },
    [methods, computeAggregate, scopeIsSelection],
  )

  // A resolved server value goes stale when its inputs (method or scope)
  // change since it was last requested — re-derive an identity key per
  // column each render and compare against what was last seen. The same key
  // change also has to invalidate a request still in flight: bumping the
  // column's request id makes the pending promise's commit guard fail on
  // arrival, so a "sum" requested before the user switched to "avg" can never
  // land and display under the new method's label as if it were fresh. A
  // column caught mid-flight resets to idle (its "Calculate" trigger) rather
  // than staying loading forever for a result that will now be dropped.
  const requestKeyRef = React.useRef<Record<string, string>>({})
  React.useEffect(() => {
    for (const columnId of columnConfig.keys()) {
      const method = methods[columnId]
      const key = `${method ?? ""}:${scopeIsSelection ? "selection" : "all"}`
      const prevKey = requestKeyRef.current[columnId]
      if (prevKey !== undefined && prevKey !== key) {
        requestIdRef.current[columnId] = (requestIdRef.current[columnId] ?? 0) + 1
        setServerStates((prev) => {
          const existing = prev[columnId]
          if (existing?.status === "value") {
            return { ...prev, [columnId]: { status: "stale", value: existing.value } }
          }
          if (existing?.status === "loading") {
            return { ...prev, [columnId]: { status: "idle" } }
          }
          return prev
        })
      }
      requestKeyRef.current[columnId] = key
    }
  }, [methods, scopeIsSelection, columnConfig])

  const stateFor = React.useCallback(
    (columnId: string): AggregateCellState | undefined => {
      const method = methods[columnId]
      if (!columnConfig.has(columnId) || !method) return undefined

      if (scopeExceedsLoaded && computeAggregate) {
        return serverStates[columnId] ?? { status: "idle" }
      }

      const values = scopeRows.map((row) => row.getValue(columnId) as number | null | undefined)
      const value = aggregate(method, values)
      return scopeExceedsLoaded
        ? { status: "value", value, partial: true }
        : { status: "value", value }
    },
    [methods, columnConfig, scopeExceedsLoaded, computeAggregate, serverStates, scopeRows],
  )

  return { methods, setMethod, stateFor, scopeIsSelection, calculate }
}
