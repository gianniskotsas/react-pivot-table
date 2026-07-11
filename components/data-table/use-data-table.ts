"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnPinningState,
  type ColumnSizingState,
  type PaginationState,
  type SortingState,
  type Table,
  type VisibilityState,
} from "@tanstack/react-table"

import { useGridNavigation } from "./use-grid-navigation"
import type { DataTableColumnMeta, DataTableRuntime } from "./types"

export type UseDataTableOptions<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  getRowId?: (row: TData, index: number) => string
  editable?: boolean
  onUpdateData?: (rowId: string, columnId: string, value: unknown) => void
  enablePagination?: boolean
}

export type UseDataTableResult<TData> = {
  table: Table<TData>
  runtime: DataTableRuntime
}

export function useDataTable<TData>({
  data,
  columns,
  getRowId,
  editable = false,
  onUpdateData,
  enablePagination = true,
}: UseDataTableOptions<TData>): UseDataTableResult<TData> {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({})
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  // React Compiler reports "Use of incompatible library" here: useReactTable
  // returns identity-stable functions it cannot safely memoize, so it skips
  // compiling this component. Expected with TanStack Table, harmless.
  const table = useReactTable<TData>({
    data,
    columns,
    getRowId: getRowId ?? ((row, index) => String(index)),
    state: {
      sorting,
      columnVisibility,
      columnPinning,
      columnSizing,
      ...(enablePagination ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(enablePagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    autoResetPageIndex: false,
  })

  const rows = table.getRowModel().rows
  const rowIds = React.useMemo(() => rows.map((r) => r.id), [rows])

  const visibleColumns = table.getVisibleLeafColumns()
  const columnIds = React.useMemo(() => visibleColumns.map((c) => c.id), [visibleColumns])

  const isColumnEditable = React.useCallback(
    (columnId: string) => {
      const override = (
        table.getColumn(columnId)?.columnDef.meta as DataTableColumnMeta | undefined
      )?.editable
      return override ?? editable
    },
    [table, editable],
  )

  const nav = useGridNavigation({ rowIds, columnIds, isColumnEditable })

  // Revalidate activeCell when rowIds/columnIds change out from under it.
  //
  // use-grid-navigation.ts's module doc comment and the orphaned-id guard
  // inside its `moveActive` both explicitly delegate this responsibility to
  // use-data-table.ts. That guard only protects a single in-flight move: if
  // `current` points at a row/column id no longer in the live lists, it
  // holds still rather than guessing a replacement. Left unaddressed here,
  // that "hold still" becomes permanent — a sort, filter, delete, or (as in
  // the tests below) an entirely new `data` array can remove the active
  // row/column, and every subsequent arrow-key/Tab press would keep
  // resolving `rowIds.indexOf(current.rowId) === -1` and silently no-op,
  // freezing keyboard navigation with no visible active cell to recover
  // from.
  //
  // GridNavigation's public API only exposes `setActiveCell(pos: CellPos)`
  // — there is no way to clear activeCell to `null` from outside the hook.
  // Widening that already-shipped, already-reviewed hook's API (e.g. adding
  // a `clearActiveCell`) is a bigger change than this task calls for, so
  // instead: when the previous activeCell's row or column id has dropped
  // out of the new lists, snap to a *column-stable, clamped-index* cell via
  // the existing `setActiveCell` rather than leaving it dangling or jumping
  // all the way back to the first cell in the grid. Concretely (mirrors how
  // Excel/Sheets handle a row disappearing): if only the row vanished, stay
  // on the same column and move to whatever row now sits at the vanished
  // row's PREVIOUS index (clamped to the new list's bounds) — i.e. whatever
  // slid into that slot, or the new last row if it was the last one. If
  // only the column vanished, the same clamped-index logic applies to the
  // column, with the row preserved. If both vanished, both adjustments
  // apply independently. This avoids losing scroll position/context for a
  // user editing deep in the grid when only one nearby row/column changes.
  //
  // `prevIdsRef` exists solely to answer "what index was the vanished id at
  // *before* this change?" — the previous id lists are looked up here, then
  // the ref is updated to the current lists at the end of the effect so the
  // next run has the immediately-prior lists to compare against. (It is
  // NOT used to gate whether the effect body runs: the effect's dependency
  // array already means React only invokes this effect when `rowIds`/
  // `columnIds` change by reference, so a same-reference check here would
  // be dead code.)
  //
  // If the grid has no rows or no columns at all, there is no valid CellPos
  // to snap to; nav's internal activeCell state is left as-is in that case.
  // Nothing renders with `isActive` matching it (there's no cell to match),
  // so the stale value is inert until rows/columns exist again, at which
  // point this effect re-validates it on the next rowIds/columnIds change.
  const prevIdsRef = React.useRef({ rowIds, columnIds })
  React.useEffect(() => {
    const prev = prevIdsRef.current
    const active = nav.activeCell

    if (active) {
      const rowStillValid = rowIds.includes(active.rowId)
      const columnStillValid = columnIds.includes(active.columnId)

      if ((!rowStillValid || !columnStillValid) && rowIds.length > 0 && columnIds.length > 0) {
        const prevRowIdx = prev.rowIds.indexOf(active.rowId)
        const nextRowId = rowStillValid
          ? active.rowId
          : rowIds[Math.min(Math.max(prevRowIdx, 0), rowIds.length - 1)]

        const prevColIdx = prev.columnIds.indexOf(active.columnId)
        const nextColumnId = columnStillValid
          ? active.columnId
          : columnIds[Math.min(Math.max(prevColIdx, 0), columnIds.length - 1)]

        nav.setActiveCell({ rowId: nextRowId, columnId: nextColumnId })
      }
    }

    prevIdsRef.current = { rowIds, columnIds }
    // nav.activeCell is intentionally excluded: it's read fresh from `nav`
    // each time this effect actually runs (gated by rowIds/columnIds
    // identity), and including it would re-run this effect on every
    // click/navigation even when the id lists haven't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowIds, columnIds, nav.setActiveCell])

  const updateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      onUpdateData?.(rowId, columnId, value)
    },
    [onUpdateData],
  )

  const runtime: DataTableRuntime = { ...nav, isColumnEditable, updateData }

  return { table, runtime }
}
