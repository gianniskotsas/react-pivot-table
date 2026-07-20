"use client"

import { DataTable } from "@/components/data-table"
import { DimensionPicker } from "@/components/dimension-picker"

import type { GroupedDataTableProps } from "./types"

/**
 * @deprecated Use `DataTable` with its `grouping` prop. This wrapper exists for
 * one migration release and will be removed — see
 * docs/superpowers/specs/2026-07-20-unified-data-table-grouping-design.md.
 */
export function GroupedDataTable<TData>(props: GroupedDataTableProps<TData>) {
  return (
    <DataTable<TData>
      data={props.data}
      columns={props.columns}
      enablePagination={props.enablePagination ?? true}
      enableExport={false}
      filterableColumns={props.filterableColumns}
      initialFilterState={props.initialFilterState}
      grouping={{
        dimensions: props.groupableDimensions,
        initial: props.initialGrouping,
        column: props.groupColumn,
        renderControl: ({ dimensions, grouping, setGrouping }) => (
          <DimensionPicker
            dimensions={dimensions}
            grouping={grouping}
            onGroupingChange={setGrouping}
          />
        ),
      }}
    />
  )
}
