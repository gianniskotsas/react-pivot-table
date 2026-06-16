"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
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
  conditionsToColumnFilters,
  makeFilterFn,
  normalizeConditions,
} from "./filter-utils"
import type { FilterCondition, FilterDef } from "./types"
import { GROUP_COLUMN_ID, type GroupedDataTableProps } from "./types"

// Stable empty default so omitting `filterableColumns` doesn't create a new
// array reference each render (which would churn the derived memos/callbacks).
const EMPTY_FILTER_COLUMNS: FilterDef[] = []

export type UseGroupedTableResult<TData> = {
  table: Table<TData>
  grouping: GroupingState
  setGrouping: (next: GroupingState) => void
  filterConditions: FilterCondition[]
  setFilterConditions: (
    next: FilterCondition[] | ((prev: FilterCondition[]) => FilterCondition[]),
  ) => void
}

export function useGroupedTable<TData>({
  data,
  columns,
  groupableDimensions,
  groupColumn,
  initialGrouping = [],
  enablePagination = true,
  filterableColumns = EMPTY_FILTER_COLUMNS,
  initialFilters = [],
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

  const [filterConditions, setFilterConditionsState] = React.useState<
    FilterCondition[]
  >(() => normalizeConditions(initialFilters, filterableIds))

  const setFilterConditions = React.useCallback(
    (
      next: FilterCondition[] | ((prev: FilterCondition[]) => FilterCondition[]),
    ) => {
      setFilterConditionsState((prev) =>
        normalizeConditions(
          typeof next === "function" ? next(prev) : next,
          filterableIds,
        ),
      )
    },
    [filterableIds],
  )

  const columnFilters = React.useMemo(
    () => conditionsToColumnFilters(filterConditions),
    [filterConditions],
  )

  const filterFn = React.useMemo(() => makeFilterFn<TData>(), [])

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

  const columnsWithFilters = React.useMemo(
    () =>
      columns.map((col) => {
        const rawKey = (col as { accessorKey?: unknown }).accessorKey
        const id =
          (col as { id?: string }).id ??
          (typeof rawKey === "string" ? rawKey : undefined)
        return id && filterableIds.includes(id) ? { ...col, filterFn } : col
      }),
    [columns, filterableIds, filterFn],
  )

  const allColumns = React.useMemo(
    () => [groupColumnDef, ...columnsWithFilters],
    [groupColumnDef, columnsWithFilters],
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
    data,
    columns: allColumns,
    state: {
      grouping,
      expanded,
      sorting,
      columnFilters,
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
    getFilteredRowModel: getFilteredRowModel(),
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

  return { table, grouping, setGrouping, filterConditions, setFilterConditions }
}
