import type { ColumnFiltersState, FilterFn } from "@tanstack/react-table"

import type {
  Combinator,
  FilterCondition,
  FilterDef,
  FilterGroup,
  FilterOperator,
  FilterState,
  FilterType,
  FilterValue,
} from "./types"

const DEFAULT_OPERATORS: Record<FilterType, FilterOperator[]> = {
  text: ["contains", "doesNotContain", "equals", "isNot", "startsWith"],
  number: ["eq", "ne", "gt", "lt", "between"],
  select: ["isAnyOf", "isNoneOf", "is"],
  date: ["before", "after", "dateBetween"],
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: "contains", doesNotContain: "does not contain", equals: "is", isNot: "is not", startsWith: "starts with",
  eq: "equals", ne: "not equal", gt: "greater than", lt: "less than", between: "between",
  is: "is", isAnyOf: "is any of", isNoneOf: "is none of",
  before: "before", after: "after", dateBetween: "between",
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
      // Guard: range operators need a [min, max] pair; a scalar mid-build
      // (e.g. only one bound entered) is treated as no constraint, not a crash.
      if (!Array.isArray(value)) return true
      const [min, max] = value as [number, number]
      // Either bound still blank (mid-build) → no constraint, so the table
      // doesn't go empty while the user is typing the first bound.
      if (String(min).trim() === "" || String(max).trim() === "") return true
      const n = Number(cellValue)
      return n >= Number(min) && n <= Number(max)
    }
    case "doesNotContain":
      return !text.includes(String(value).toLowerCase())
    case "isNot":
      return String(cellValue ?? "").toLowerCase() !== String(value).toLowerCase()
    case "isNoneOf":
      return !(value as string[]).map(String).includes(String(cellValue ?? ""))
    // `is`/`isAnyOf` are case-sensitive by design: select columns hold exact
    // enum values (e.g. "HSBC"), unlike the case-insensitive text operators.
    case "is":
      return String(cellValue ?? "") === String(value)
    case "isAnyOf":
      return (value as string[]).map(String).includes(String(cellValue ?? ""))
    case "before":
      return new Date(String(cellValue)).getTime() < new Date(String(value)).getTime()
    case "after":
      return new Date(String(cellValue)).getTime() > new Date(String(value)).getTime()
    case "dateBetween": {
      if (!Array.isArray(value)) return true
      const [start, end] = value as string[]
      if (String(start).trim() === "" || String(end).trim() === "") return true
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
  if (!def) {
    throw new Error("createCondition: filterDefs must not be empty")
  }
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

// ─── Filter v2: group model + tree evaluation ────────────────────────────────

export function isConditionComplete(condition: FilterCondition): boolean {
  return !isEmpty(condition.value)
}

export function evaluateGroup(group: FilterGroup, get: (columnId: string) => unknown): boolean {
  const active = group.conditions.filter(isConditionComplete)
  if (active.length === 0) return true
  const results = active.map((c) => evaluateCondition(get(c.columnId), c.operator, c.value))
  return group.combinator === "and" ? results.every(Boolean) : results.some(Boolean)
}

export function evaluateFilterState(state: FilterState, get: (columnId: string) => unknown): boolean {
  const active = state.groups.filter((g) => g.conditions.some(isConditionComplete))
  if (active.length === 0) return true
  const results = active.map((g) => evaluateGroup(g, get))
  return state.combinator === "and" ? results.every(Boolean) : results.some(Boolean)
}

export function countActiveConditions(state: FilterState): number {
  return state.groups.reduce((sum, g) => sum + g.conditions.filter(isConditionComplete).length, 0)
}

export function emptyFilterState(): FilterState {
  return { combinator: "and", groups: [] }
}

export function newGroup(id: string, conditionId: string, filterDefs: FilterDef[]): FilterGroup {
  return { id, combinator: "and", conditions: [createCondition(filterDefs, conditionId)] }
}

export function addGroup(state: FilterState, groupId: string, conditionId: string, filterDefs: FilterDef[]): FilterState {
  return { ...state, groups: [...state.groups, newGroup(groupId, conditionId, filterDefs)] }
}

function mapGroup(state: FilterState, groupId: string, fn: (g: FilterGroup) => FilterGroup): FilterState {
  return { ...state, groups: state.groups.map((g) => (g.id === groupId ? fn(g) : g)) }
}

export function addConditionToGroup(state: FilterState, groupId: string, condition: FilterCondition): FilterState {
  return mapGroup(state, groupId, (g) => ({ ...g, conditions: [...g.conditions, condition] }))
}

export function updateConditionInGroup(state: FilterState, groupId: string, condition: FilterCondition): FilterState {
  return mapGroup(state, groupId, (g) => ({ ...g, conditions: g.conditions.map((c) => (c.id === condition.id ? condition : c)) }))
}

export function removeConditionFromGroup(state: FilterState, groupId: string, conditionId: string): FilterState {
  const next = mapGroup(state, groupId, (g) => ({ ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) }))
  return { ...next, groups: next.groups.filter((g) => g.conditions.length > 0) }
}

export function removeGroup(state: FilterState, groupId: string): FilterState {
  return { ...state, groups: state.groups.filter((g) => g.id !== groupId) }
}

export function setGroupCombinator(state: FilterState, groupId: string, combinator: Combinator): FilterState {
  return mapGroup(state, groupId, (g) => ({ ...g, combinator }))
}

export function setTopCombinator(state: FilterState, combinator: Combinator): FilterState {
  return { ...state, combinator }
}

export function normalizeFilterState(state: FilterState, filterableIds: string[]): FilterState {
  const allowed = new Set(filterableIds)
  const groups = state.groups
    .map((g) => ({ ...g, conditions: g.conditions.filter((c) => allowed.has(c.columnId)) }))
    .filter((g) => g.conditions.length > 0)
  return { ...state, groups }
}
