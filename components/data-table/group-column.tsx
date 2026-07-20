import type { ColumnDef } from "@tanstack/react-table"

import { GROUP_COLUMN_ID, type GroupColumnConfig } from "./types"

/**
 * Builds the synthesized auto group column. Prepended by useDataTable when
 * `grouping` is configured — a table-owned structural column with no TData
 * accessor, exactly like buildRowGutterColumn. Cell content is rendered by
 * GroupAwareCell in the table body; this only reserves the slot and the header.
 */
export function buildGroupColumn<TData>(
  config: GroupColumnConfig<TData>,
): ColumnDef<TData, unknown> {
  return {
    id: GROUP_COLUMN_ID,
    header: () => config.header ?? null,
    enableGrouping: false,
    enableSorting: false,
    enableHiding: false,
    enableResizing: true,
    cell: () => null,
  }
}
