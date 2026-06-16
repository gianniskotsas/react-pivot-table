export { GroupedDataTable } from "./grouped-data-table"
export { useGroupedTable, type UseGroupedTableResult } from "./use-grouped-table"
export { GroupCell, type GroupCellProps } from "./group-cell"
export {
  DimensionPicker,
  DimensionPickerContent,
  reorderGrouping,
} from "./dimension-picker"
export {
  GROUP_COLUMN_ID,
  type DimensionDef,
  type GroupColumnConfig,
  type GroupedDataTableProps,
} from "./types"
export { FilterPopover, FilterBuilderContent } from "./filter-builder"
export { FilterChips } from "./filter-chips"
export {
  type FilterType,
  type FilterOperator,
  type FilterDef,
  type FilterCondition,
  type FilterValue,
} from "./types"
// Pure filter helpers — for custom UIs and for a future MCP tool that emits or
// describes filter config/conditions.
export {
  OPERATOR_LABELS,
  conditionsToColumnFilters,
  createCondition,
  defaultOperatorsFor,
  describeCondition,
  evaluateCondition,
  makeFilterFn,
  normalizeConditions,
  operatorsForDef,
  removeCondition,
  replaceCondition,
  withColumn,
  withOperator,
  withValue,
} from "./filter-utils"
