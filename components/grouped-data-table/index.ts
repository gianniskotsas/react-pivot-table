export { GroupedDataTable } from "./grouped-data-table"
export { useGroupedTable, type UseGroupedTableResult } from "./use-grouped-table"

// Re-exported from their new homes so existing imports from this barrel keep working.
export {
  GroupAwareCell as GroupCell,
  type GroupAwareCellProps as GroupCellProps,
  GROUP_COLUMN_ID,
  MultiSelect,
  MultiSelectContent,
  multiSelectLabel,
  FilterPopover,
  FilterBuilderContent,
  OPERATOR_LABELS,
  createCondition,
  defaultOperatorsFor,
  describeCondition,
  evaluateCondition,
  operatorsForDef,
  type DimensionDef,
  type GroupColumnConfig,
  type GroupLeafConfig,
  type FilterType,
  type FilterOperator,
  type FilterDef,
  type FilterCondition,
  type FilterValue,
  type Combinator,
} from "@/components/data-table"
export { DimensionPicker, DimensionPickerContent, reorderGrouping } from "@/components/dimension-picker"
export type { GroupedDataTableProps } from "./types"
