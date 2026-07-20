"use client"

import { useDataTable } from "@/components/data-table"
import type { Table } from "@tanstack/react-table"

import type { GroupedDataTableProps } from "./types"
import type { FilterState } from "./types"

export type UseGroupedTableResult<TData> = {
  table: Table<TData>
  grouping: string[]
  setGrouping: (next: string[]) => void
  filterState: FilterState
  setFilterState: (next: FilterState | ((prev: FilterState) => FilterState)) => void
}

/**
 * @deprecated Use `useDataTable` with its `grouping` option. Thin adapter kept
 * for one migration release.
 */
export function useGroupedTable<TData>(
  props: GroupedDataTableProps<TData>,
): UseGroupedTableResult<TData> {
  const { table, grouping, setGrouping, filterState, setFilterState } = useDataTable<TData>({
    data: props.data,
    columns: props.columns,
    enablePagination: props.enablePagination ?? true,
    filterableColumns: props.filterableColumns,
    initialFilterState: props.initialFilterState,
    grouping: {
      dimensions: props.groupableDimensions,
      initial: props.initialGrouping,
      column: props.groupColumn,
    },
  })
  return { table, grouping, setGrouping, filterState, setFilterState }
}
