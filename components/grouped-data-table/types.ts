import type { ColumnDef } from "@tanstack/react-table"

export {
  GROUP_COLUMN_ID,
  type DimensionDef,
  type GroupLeafConfig,
  type GroupColumnConfig,
  type FilterType,
  type FilterOperator,
  type FilterDef,
  type FilterValue,
  type FilterCondition,
  type Combinator,
  type FilterGroup,
  type FilterState,
} from "@/components/data-table"

import type { DimensionDef, GroupColumnConfig, FilterDef, FilterState } from "@/components/data-table"

/** @deprecated Use `DataTableProps` with its `grouping` config. */
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
