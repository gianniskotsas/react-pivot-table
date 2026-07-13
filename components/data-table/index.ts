export { DataTable, type DataTableProps } from "./data-table"
export { defineColumns } from "./define-columns"
export { ColumnHeader } from "./column-header"
export { ColumnsMenu, ColumnsMenuContent } from "./columns-menu"
export { useDataTable, type UseDataTableOptions, type UseDataTableResult } from "./use-data-table"
export { useGridNavigation, type GridNavigation, type UseGridNavigationOptions } from "./use-grid-navigation"
export { DataTableRuntimeContext, useDataTableRuntime } from "./data-table-runtime-context"
export {
  FieldSelect,
  PopoverButtonTrigger,
  type FieldSelectProps,
  type PopoverButtonTriggerProps,
  type SelectOption,
} from "./primitives"
export { buildRowGutterColumn, ROW_GUTTER_COLUMN_ID } from "./row-gutter"
export { aggregate, AGGREGATION_METHOD_LABELS, ALL_AGGREGATION_METHODS } from "./aggregate"
export {
  useFooterAggregation,
  type UseFooterAggregationOptions,
  type FooterAggregationResult,
} from "./use-footer-aggregation"
export { DataTableFooter } from "./footer-aggregation"
export { createUndoStack, type UndoStack, type UndoBatch, type CellEdit } from "./undo"
export { parseTsv, gridToTsv, planPaste, type ClipboardColumn, type PastePlan } from "./clipboard"
export { exportCsv, downloadCsv, type CsvColumn } from "./export-csv"
export { FilterPopover, FilterBuilderContent } from "./filter-builder"
export { MultiSelect, MultiSelectContent, multiSelectLabel } from "./multi-select"
export { ActionsMenu, ActionsMenuContent } from "./actions-menu"
export type {
  CellPos,
  DataTableColumnMeta,
  DataTableRuntime,
  MoveDirection,
  AggregationMethod,
  CalculableColumn,
  ComputeAggregateArgs,
  AggregateCellState,
  FilterType,
  FilterOperator,
  FilterDef,
  FilterCondition,
  FilterValue,
  Combinator,
  FilterGroup,
  FilterState,
  DataTableAction,
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
