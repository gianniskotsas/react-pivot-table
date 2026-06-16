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

export type FilterType = "text" | "number" | "select" | "date"

export type FilterOperator =
  | "contains" | "doesNotContain" | "equals" | "isNot" | "startsWith"
  | "eq" | "ne" | "gt" | "lt" | "between"
  | "is" | "isAnyOf" | "isNoneOf"
  | "before" | "after" | "dateBetween"

export type FilterDef = {
  /**
   * Must match a column's `id`/`accessorKey` AND a key on the row data — the
   * filter engine reads the value via `row[id]`. Filterable columns must
   * therefore be accessorKey-based (not `accessorFn`-only).
   */
  id: string
  label: string
  type: FilterType
  /** Allowed operators; falls back to the type default when omitted. */
  operators?: FilterOperator[]
  /** Required for type "select" — the choosable values. */
  options?: { label: string; value: string }[]
}

export type FilterValue =
  | string
  | number
  | [number, number]
  | string[]
  | null

export type FilterCondition = {
  /** Unique id for keying / removal. */
  id: string
  columnId: string
  operator: FilterOperator
  value: FilterValue
}

export type Combinator = "and" | "or"
export type FilterGroup = { id: string; combinator: Combinator; conditions: FilterCondition[] }
export type FilterState = { combinator: Combinator; groups: FilterGroup[] }

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
  /** Declares which columns are filterable and how (the filter "options"). */
  filterableColumns?: FilterDef[]
  /** Initial filter state (groups + AND/OR). */
  initialFilterState?: FilterState
}
