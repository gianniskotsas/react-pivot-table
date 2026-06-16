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
export { MultiSelect, MultiSelectContent, multiSelectLabel } from "./multi-select"
export {
  type FilterType,
  type FilterOperator,
  type FilterDef,
  type FilterCondition,
  type FilterValue,
  type Combinator,
  type FilterGroup,
  type FilterState,
} from "./types"
// Pure filter helpers — for custom UIs and for a future MCP tool that emits or
// describes filter config/conditions.
export {
  OPERATOR_LABELS,
  createCondition,
  defaultOperatorsFor,
  describeCondition,
  evaluateCondition,
  operatorsForDef,
  withColumn,
  withOperator,
  withValue,
  evaluateFilterState,
  evaluateGroup,
  emptyFilterState,
  countActiveConditions,
  isConditionComplete,
  newGroup,
  addGroup,
  addConditionToGroup,
  updateConditionInGroup,
  removeConditionFromGroup,
  removeGroup,
  setGroupCombinator,
  setTopCombinator,
  normalizeFilterState,
} from "./filter-utils"
