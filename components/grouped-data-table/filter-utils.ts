import type { ColumnFiltersState, FilterFn } from "@tanstack/react-table"

import type {
  FilterCondition,
  FilterDef,
  FilterOperator,
  FilterType,
  FilterValue,
} from "./types"

const DEFAULT_OPERATORS: Record<FilterType, FilterOperator[]> = {
  text: ["contains", "equals", "startsWith"],
  number: ["eq", "ne", "gt", "lt", "between"],
  select: ["is", "isAnyOf"],
  date: ["before", "after", "dateBetween"],
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: "contains",
  equals: "equals",
  startsWith: "starts with",
  eq: "=",
  ne: "≠",
  gt: ">",
  lt: "<",
  between: "between",
  is: "is",
  isAnyOf: "is any of",
  before: "before",
  after: "after",
  dateBetween: "between",
}

export function defaultOperatorsFor(type: FilterType): FilterOperator[] {
  return DEFAULT_OPERATORS[type]
}

export function operatorsForDef(def: FilterDef): FilterOperator[] {
  return def.operators && def.operators.length > 0
    ? def.operators
    : defaultOperatorsFor(def.type)
}

function isEmpty(value: FilterValue): boolean {
  if (value == null) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) {
    return value.length === 0 || value.every((v) => v == null || v === "")
  }
  return false
}

export function evaluateCondition(
  cellValue: unknown,
  operator: FilterOperator,
  value: FilterValue,
): boolean {
  if (isEmpty(value)) return true

  const text = String(cellValue ?? "").toLowerCase()
  switch (operator) {
    case "contains":
      return text.includes(String(value).toLowerCase())
    case "equals":
      return text === String(value).toLowerCase()
    case "startsWith":
      return text.startsWith(String(value).toLowerCase())
    case "eq":
      return Number(cellValue) === Number(value)
    case "ne":
      return Number(cellValue) !== Number(value)
    case "gt":
      return Number(cellValue) > Number(value)
    case "lt":
      return Number(cellValue) < Number(value)
    case "between": {
      const [min, max] = value as [number, number]
      const n = Number(cellValue)
      return n >= Number(min) && n <= Number(max)
    }
    case "is":
      return String(cellValue ?? "") === String(value)
    case "isAnyOf":
      return (value as string[]).map(String).includes(String(cellValue ?? ""))
    case "before":
      return new Date(String(cellValue)).getTime() < new Date(String(value)).getTime()
    case "after":
      return new Date(String(cellValue)).getTime() > new Date(String(value)).getTime()
    case "dateBetween": {
      const [start, end] = value as string[]
      const t = new Date(String(cellValue)).getTime()
      return t >= new Date(start).getTime() && t <= new Date(end).getTime()
    }
    default:
      return true
  }
}

export function conditionsToColumnFilters(
  conditions: FilterCondition[],
): ColumnFiltersState {
  const byColumn = new Map<string, FilterCondition[]>()
  for (const condition of conditions) {
    const existing = byColumn.get(condition.columnId) ?? []
    existing.push(condition)
    byColumn.set(condition.columnId, existing)
  }
  return Array.from(byColumn, ([id, value]) => ({ id, value }))
}

export function makeFilterFn<TData>(): FilterFn<TData> {
  return (row, columnId, filterValue) => {
    const conditions = (filterValue as FilterCondition[]) ?? []
    const cellValue = row.getValue(columnId)
    return conditions.every((c) =>
      evaluateCondition(cellValue, c.operator, c.value),
    )
  }
}

export function describeCondition(
  condition: FilterCondition,
  def?: FilterDef,
): string {
  const label = def?.label ?? condition.columnId
  const op = OPERATOR_LABELS[condition.operator]
  const value = condition.value

  const labelFor = (raw: unknown): string =>
    def?.type === "select"
      ? (def.options?.find((o) => o.value === String(raw))?.label ?? String(raw))
      : String(raw)

  let valueStr: string
  if (Array.isArray(value)) {
    const sep =
      condition.operator === "between" || condition.operator === "dateBetween"
        ? "–"
        : ", "
    valueStr = value.map(labelFor).join(sep)
  } else if (value == null) {
    valueStr = ""
  } else {
    valueStr = labelFor(value)
  }
  return `${label} ${op} ${valueStr}`.trim()
}

export function createCondition(
  filterDefs: FilterDef[],
  id: string,
): FilterCondition {
  const def = filterDefs[0]
  return { id, columnId: def.id, operator: operatorsForDef(def)[0], value: null }
}

export function withColumn(
  condition: FilterCondition,
  columnId: string,
  filterDefs: FilterDef[],
): FilterCondition {
  const def = filterDefs.find((d) => d.id === columnId) ?? filterDefs[0]
  return {
    ...condition,
    columnId: def.id,
    operator: operatorsForDef(def)[0],
    value: null,
  }
}

export function withOperator(
  condition: FilterCondition,
  operator: FilterOperator,
): FilterCondition {
  return { ...condition, operator, value: null }
}

export function withValue(
  condition: FilterCondition,
  value: FilterValue,
): FilterCondition {
  return { ...condition, value }
}

export function removeCondition(
  conditions: FilterCondition[],
  id: string,
): FilterCondition[] {
  return conditions.filter((c) => c.id !== id)
}

export function replaceCondition(
  conditions: FilterCondition[],
  next: FilterCondition,
): FilterCondition[] {
  return conditions.map((c) => (c.id === next.id ? next : c))
}

export function normalizeConditions(
  conditions: FilterCondition[],
  filterableIds: string[],
): FilterCondition[] {
  const allowed = new Set(filterableIds)
  return conditions.filter((c) => allowed.has(c.columnId))
}
