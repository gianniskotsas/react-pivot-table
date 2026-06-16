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
  type ColumnFiltersState,
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
import { GROUP_COLUMN_ID, type GroupedDataTableProps } from "./types"

export type UseGroupedTableResult<TData> = {
  table: Table<TData>
  grouping: GroupingState
  setGrouping: (next: GroupingState) => void
}

export function useGroupedTable<TData>({
  data,
  columns,
  groupableDimensions,
  groupColumn,
  initialGrouping = [],
  enablePagination = true,
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
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  // setGrouping that always normalizes against allowed dimensions.
  const setGrouping = React.useCallback(
    (next: GroupingState) => {
      setGroupingState(normalizeGrouping(next, allowedIds))
    },
    [allowedIds],
  )

  // Synthesized auto group column. The actual cell rendering is handled by
  // <GroupCell> in the table body (a later task); here we only reserve the slot.
  const groupColumnDef = React.useMemo<ColumnDef<TData, unknown>>(
    () => ({
      id: GROUP_COLUMN_ID,
      header: () => groupColumn.header ?? null,
      enableGrouping: false,
      cell: () => null,
    }),
    [groupColumn],
  )

  const allColumns = React.useMemo(
    () => [groupColumnDef, ...columns],
    [groupColumnDef, columns],
  )

  const columnVisibility = React.useMemo(
    () => deriveColumnVisibility(grouping),
    [grouping],
  )

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
    onColumnFiltersChange: setColumnFilters,
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
  })

  return { table, grouping, setGrouping }
}
