import type { ColumnDef, Row } from "@tanstack/react-table"
import type * as React from "react"

/** Stable id for the synthesized auto group column. */
export const GROUP_COLUMN_ID = "__group__" as const

/** A groupable column surfaced in the dimension picker. */
export type DimensionDef = {
  /** Must match the `id` of a column in `columns`. */
  id: string
  /** Human-readable label shown in the picker. */
  label: string
}

export type GroupColumnConfig<TData> = {
  /** Header text for the auto group column, e.g. "Account". */
  header?: React.ReactNode
  /** Renders a leaf (non-group) row inside the group column. */
  renderLeaf: (row: Row<TData>) => React.ReactNode
  /**
   * How the `(count)` next to a group label is computed.
   * "leaf" = total leaf descendants (default), "immediate" = direct sub-rows.
   */
  countMode?: "leaf" | "immediate"
  /** Pixels of indentation per depth level. Default 24. */
  indentSize?: number
}

export type GroupedDataTableProps<TData> = {
  data: TData[]
  /** Measure / attribute columns. Groupable columns must set `enableGrouping: true`. */
  columns: ColumnDef<TData, unknown>[]
  /** Which columns the developer allows grouping on. */
  groupableDimensions: DimensionDef[]
  groupColumn: GroupColumnConfig<TData>
  /**
   * Initial hierarchy order, e.g. ["entity", "bank"]. Applied once at mount;
   * later changes to this prop are ignored (use the returned `setGrouping` to
   * change grouping after mount).
   */
  initialGrouping?: string[]
  /** Enable client-side pagination. Default true. */
  enablePagination?: boolean
}
