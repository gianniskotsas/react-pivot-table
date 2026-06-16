"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type GroupingState,
  type PaginationState,
  type SortingState,
  type Table,
} from "@tanstack/react-table"

import {
  deriveColumnVisibility,
  normalizeGrouping,
} from "./grouping-utils"
import {
  evaluateFilterState,
  normalizeFilterState,
  emptyFilterState,
} from "./filter-utils"
import type { FilterState } from "./types"
import { GROUP_COLUMN_ID, type FilterDef, type GroupedDataTableProps } from "./types"

// Stable empty default so omitting `filterableColumns` doesn't create a new
// array reference each render (which would churn the derived memos/callbacks).
const EMPTY_FILTER_COLUMNS: FilterDef[] = []

export type UseGroupedTableResult<TData> = {
  table: Table<TData>
  grouping: GroupingState
  setGrouping: (next: GroupingState) => void
  filterState: FilterState
  setFilterState: (next: FilterState | ((prev: FilterState) => FilterState)) => void
}

export function useGroupedTable<TData>({
  data,
  columns,
  groupableDimensions,
  groupColumn,
  initialGrouping = [],
  enablePagination = true,
  filterableColumns = EMPTY_FILTER_COLUMNS,
  initialFilterState,
}: GroupedDataTableProps<TData>): UseGroupedTableResult<TData> {
  const allowedIds = React.useMemo(
    () => groupableDimensions.map((d) => d.id),
    [groupableDimensions],
  )

  const [grouping, setGroupingState] = React.useState<GroupingState>(() =>
    normalizeGrouping(initialGrouping, allowedIds),
  )
  const [expanded, setExpanded] = React.useState<ExpandedState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  const filterableIds = React.useMemo(
    () => filterableColumns.map((f) => f.id),
    [filterableColumns],
  )

  const [filterState, setFilterStateRaw] = React.useState<FilterState>(() =>
    normalizeFilterState(initialFilterState ?? emptyFilterState(), filterableIds),
  )

  const setFilterState = React.useCallback(
    (next: FilterState | ((prev: FilterState) => FilterState)) => {
      setFilterStateRaw((prev) =>
        normalizeFilterState(typeof next === "function" ? next(prev) : next, filterableIds),
      )
    },
    [filterableIds],
  )

  // Pre-filter rows against the FilterState tree, then hand the result to
  // TanStack (so grouping/aggregation/counts recompute over filtered rows).
  // Values are read by accessorKey via `row[columnId]` — see FilterDef.id.
  const filteredData = React.useMemo(() => {
    if (filterState.groups.length === 0) return data
    return data.filter((row) =>
      evaluateFilterState(filterState, (columnId) => (row as Record<string, unknown>)[columnId]),
    )
  }, [data, filterState])

  // setGrouping that always normalizes against allowed dimensions.
  const setGrouping = React.useCallback(
    (next: GroupingState) => {
      setGroupingState(normalizeGrouping(next, allowedIds))
    },
    [allowedIds],
  )

  // Synthesized auto group column. The actual cell rendering is handled by
  // <GroupCell> in the table body; here we only reserve the slot. The def only
  // reads `groupColumn.header`, so memoize on that alone — depending on the whole
  // `groupColumn` object would rebuild the column array whenever a consumer passes
  // an inline config literal (e.g. `groupColumn={{ renderLeaf: ... }}`).
  const groupColumnDef = React.useMemo<ColumnDef<TData, unknown>>(
    () => ({
      id: GROUP_COLUMN_ID,
      header: () => groupColumn.header ?? null,
      enableGrouping: false,
      cell: () => null,
    }),
    [groupColumn.header],
  )

  const allColumns = React.useMemo(
    () => [groupColumnDef, ...columns],
    [groupColumnDef, columns],
  )

  // `columnVisibility` is fully derived from `grouping`: grouped dimension columns
  // are hidden so their values appear only in the auto group column. This is
  // intentionally one-way — no `onColumnVisibilityChange` is wired, so consumer
  // calls to `table.toggleVisibility()` would be overridden on the next render. If
  // user-toggled visibility is ever needed, merge it here:
  // `{ ...userVisibility, ...deriveColumnVisibility(grouping) }`.
  const columnVisibility = React.useMemo(
    () => deriveColumnVisibility(grouping),
    [grouping],
  )

  // React Compiler reports "Use of incompatible library" here: useReactTable
  // returns identity-stable functions it cannot safely memoize, so it skips
  // compiling this component. This is expected with TanStack Table and is
  // harmless — the table manages its own memoization internally.
  const table = useReactTable<TData>({
    data: filteredData,
    columns: allColumns,
    state: {
      grouping,
      expanded,
      sorting,
      columnVisibility,
      ...(enablePagination ? { pagination } : {}),
    },
    onGroupingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(grouping) : updater
      setGrouping(next)
    },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    ...(enablePagination
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    paginateExpandedRows: false,
    autoResetExpanded: false,
    // Don't bounce the user back to page 1 when filters/grouping/sorting change.
    autoResetPageIndex: false,
  })

  return { table, grouping, setGrouping, filterState, setFilterState }
}
