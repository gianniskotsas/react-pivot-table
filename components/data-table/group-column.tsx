import type { ColumnDef } from "@tanstack/react-table"

import { GROUP_COLUMN_ID, type DataTableColumnMeta, type GroupColumnConfig } from "./types"

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
    // Defense in depth: use-data-table.ts's own `columnIds` memo already
    // excludes GROUP_COLUMN_ID from nav/clipboard/bulk-clear, so
    // isColumnEditable("__group__") is never actually consulted through
    // those paths — but it IS a public, directly-callable method on
    // DataTableRuntime, and without this it would fall back to the
    // table-level `editable` default and misreport this structural,
    // no-accessor column as editable to any caller that asks directly.
    // `label` is required by DataTableColumnMeta (e.g. for the columns
    // menu); `config.header` is a ReactNode and usually a plain string in
    // practice, so that's reused when possible, with a static fallback
    // otherwise.
    meta: {
      editable: false,
      label: typeof config.header === "string" ? config.header : "Group",
    } satisfies DataTableColumnMeta,
  }
}
