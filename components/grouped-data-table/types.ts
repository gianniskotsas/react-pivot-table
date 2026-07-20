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
  columns: ColumnDef<TData, unknown>[]
  groupableDimensions: DimensionDef[]
  groupColumn: GroupColumnConfig<TData>
  initialGrouping?: string[]
  enablePagination?: boolean
  filterableColumns?: FilterDef[]
  initialFilterState?: FilterState
}
