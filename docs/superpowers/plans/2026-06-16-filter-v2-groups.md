# Filter v2 (Groups, AND/OR, Multi-select) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat filter model with two-level AND/OR filter groups, human-readable operators (with negations), a reusable "N selected" multi-select dropdown for filter values and group-by dimensions, and pre-filtered-data evaluation.

**Architecture:** A pure `evaluateFilterState(state, get)` walks the group tree; the hook pre-filters `data` with it and feeds the result to TanStack (no more `columnFilters`/`filterFn`). UI is rebuilt around `FilterState` (groups of conditions + combinators). A `MultiSelect` (Popover + checkbox list, "N selected" trigger) is shared by the filter value input and the dimension picker.

**Tech Stack:** Next.js 16, React 19, TS strict, `@tanstack/react-table` v8, shadcn (base-ui), `@dnd-kit`, Vitest + Testing Library, pnpm.

Spec: `docs/superpowers/specs/2026-06-16-filter-v2-groups-design.md`

---

## Migration ordering (keep build green)

Tasks 1–2 are **additive** (new types/helpers/component alongside v1; build + suite stay green). Task 3 is the **coupled migration** (hook + builder + toolbar + example + delete chips + drop dead v1 helpers) committed once at green. Task 4 updates the dimension picker. Task 5 is the gate.

## File Structure

```
components/grouped-data-table/
  types.ts             # + Combinator/FilterGroup/FilterState; + operators; + initialFilterState
  filter-utils.ts      # + new operators, evaluateGroup/evaluateFilterState, tree helpers
  multi-select.tsx     # NEW reusable multi-select dropdown
  filter-builder.tsx   # rebuilt around FilterState (groups + connectors + MultiSelect)
  dimension-picker.tsx # MultiSelect dropdown + existing drag-reorder list
  use-grouped-table.ts # filterState + pre-filtered data
  grouped-data-table.tsx # toolbar (no chips row)
  filter-chips.tsx     # DELETED in Task 3
  index.ts             # updated exports
app/(examples)/accounts/accounts-table.tsx  # initialFilters → (optional) initialFilterState
```

---

### Task 1: Types, operators, and pure tree logic (additive, TDD)

**Files:**
- Modify: `components/grouped-data-table/types.ts`
- Modify: `components/grouped-data-table/filter-utils.ts`
- Modify: `components/grouped-data-table/filter-utils.test.ts`

Keep all existing v1 exports intact (so the hook/builder still compile). Add new types/helpers and update operator labels.

- [ ] **Step 1: Extend `types.ts`** (keep existing content; add/extend the following)

Replace the `FilterOperator` union with:
```ts
export type FilterOperator =
  | "contains"
  | "doesNotContain"
  | "equals"
  | "isNot"
  | "startsWith"
  | "eq"
  | "ne"
  | "gt"
  | "lt"
  | "between"
  | "is"
  | "isAnyOf"
  | "isNoneOf"
  | "before"
  | "after"
  | "dateBetween"
```

Add after `FilterCondition`:
```ts
export type Combinator = "and" | "or"

export type FilterGroup = {
  id: string
  combinator: Combinator
  conditions: FilterCondition[]
}

export type FilterState = {
  combinator: Combinator
  groups: FilterGroup[]
}
```

In `GroupedDataTableProps<TData>`, ADD (keep `initialFilters` for now so v1 compiles; it is removed in Task 3):
```ts
  /** Initial filter state (groups + AND/OR). Replaces initialFilters in v2. */
  initialFilterState?: FilterState
```

- [ ] **Step 2: Update the failing tests in `filter-utils.test.ts`**

The label change means the existing `describeCondition` "greater than" expectation changes. Update the existing `describeCondition` "gt" test and add new-operator + tree tests. Apply these edits:

Change the existing test:
```ts
  it("uses label, operator symbol, and value", () => {
    expect(
      describeCondition({ id: "a", columnId: "balance", operator: "gt", value: 100 }, defs[1]),
    ).toBe("Balance greater than 100")
  })
```

Append new describe blocks at the end of the file:
```ts
import type { FilterGroup, FilterState } from "./types"
import {
  addConditionToGroup,
  addGroup,
  countActiveConditions,
  emptyFilterState,
  evaluateFilterState,
  evaluateGroup,
  isConditionComplete,
  newGroup,
  normalizeFilterState,
  removeConditionFromGroup,
  removeGroup,
  setGroupCombinator,
  setTopCombinator,
  updateConditionInGroup,
} from "./filter-utils"

describe("new operators", () => {
  it("doesNotContain / isNot / isNoneOf", () => {
    expect(evaluateCondition("HSBC", "doesNotContain", "citi")).toBe(true)
    expect(evaluateCondition("HSBC", "doesNotContain", "hs")).toBe(false)
    expect(evaluateCondition("HSBC", "isNot", "Citi")).toBe(true)
    expect(evaluateCondition("HSBC", "isNot", "hsbc")).toBe(false)
    expect(evaluateCondition("ING", "isNoneOf", ["HSBC", "Citi"])).toBe(true)
    expect(evaluateCondition("HSBC", "isNoneOf", ["HSBC", "Citi"])).toBe(false)
    // empty value → no constraint
    expect(evaluateCondition("x", "doesNotContain", "")).toBe(true)
    expect(evaluateCondition("x", "isNoneOf", [])).toBe(true)
  })
})

const get =
  (row: Record<string, unknown>) =>
  (columnId: string): unknown =>
    row[columnId]

describe("evaluateGroup", () => {
  const group = (combinator: "and" | "or"): FilterGroup => ({
    id: "g1",
    combinator,
    conditions: [
      { id: "a", columnId: "bank", operator: "is", value: "HSBC" },
      { id: "b", columnId: "balance", operator: "gt", value: 100 },
    ],
  })
  it("AND requires all conditions", () => {
    expect(evaluateGroup(group("and"), get({ bank: "HSBC", balance: 200 }))).toBe(true)
    expect(evaluateGroup(group("and"), get({ bank: "HSBC", balance: 10 }))).toBe(false)
  })
  it("OR requires any condition", () => {
    expect(evaluateGroup(group("or"), get({ bank: "Citi", balance: 200 }))).toBe(true)
    expect(evaluateGroup(group("or"), get({ bank: "Citi", balance: 10 }))).toBe(false)
  })
  it("empty/incomplete-only group is no constraint", () => {
    const g: FilterGroup = { id: "g", combinator: "and", conditions: [
      { id: "a", columnId: "bank", operator: "is", value: null },
    ] }
    expect(evaluateGroup(g, get({ bank: "anything" }))).toBe(true)
  })
})

describe("evaluateFilterState", () => {
  const state: FilterState = {
    combinator: "or",
    groups: [
      { id: "g1", combinator: "and", conditions: [
        { id: "a", columnId: "bank", operator: "is", value: "HSBC" },
      ] },
      { id: "g2", combinator: "and", conditions: [
        { id: "b", columnId: "balance", operator: "gt", value: 1000 },
      ] },
    ],
  }
  it("top OR matches either group", () => {
    expect(evaluateFilterState(state, get({ bank: "HSBC", balance: 1 }))).toBe(true)
    expect(evaluateFilterState(state, get({ bank: "Citi", balance: 5000 }))).toBe(true)
    expect(evaluateFilterState(state, get({ bank: "Citi", balance: 1 }))).toBe(false)
  })
  it("top AND requires all groups", () => {
    const andState: FilterState = { ...state, combinator: "and" }
    expect(evaluateFilterState(andState, get({ bank: "HSBC", balance: 5000 }))).toBe(true)
    expect(evaluateFilterState(andState, get({ bank: "HSBC", balance: 1 }))).toBe(false)
  })
  it("empty state is no constraint", () => {
    expect(evaluateFilterState(emptyFilterState(), get({}))).toBe(true)
  })
})

describe("isConditionComplete / countActiveConditions", () => {
  it("complete when value is non-empty", () => {
    expect(isConditionComplete({ id: "a", columnId: "x", operator: "is", value: "v" })).toBe(true)
    expect(isConditionComplete({ id: "a", columnId: "x", operator: "is", value: null })).toBe(false)
  })
  it("counts only complete conditions across groups", () => {
    const state: FilterState = { combinator: "and", groups: [
      { id: "g1", combinator: "and", conditions: [
        { id: "a", columnId: "x", operator: "is", value: "v" },
        { id: "b", columnId: "y", operator: "is", value: null },
      ] },
      { id: "g2", combinator: "and", conditions: [
        { id: "c", columnId: "z", operator: "is", value: "w" },
      ] },
    ] }
    expect(countActiveConditions(state)).toBe(2)
  })
})

describe("tree mutation helpers", () => {
  const defs: FilterDef[] = [{ id: "bank", label: "Bank", type: "select", options: [] }]
  it("emptyFilterState / newGroup", () => {
    expect(emptyFilterState()).toEqual({ combinator: "and", groups: [] })
    expect(newGroup("g1", "c1", defs)).toEqual({
      id: "g1",
      combinator: "and",
      conditions: [{ id: "c1", columnId: "bank", operator: "isAnyOf", value: null }],
    })
  })
  it("addGroup appends a seeded group", () => {
    const s = addGroup(emptyFilterState(), "g1", "c1", defs)
    expect(s.groups).toHaveLength(1)
    expect(s.groups[0].conditions).toHaveLength(1)
  })
  it("addConditionToGroup / updateConditionInGroup / removeConditionFromGroup", () => {
    let s = addGroup(emptyFilterState(), "g1", "c1", defs)
    s = addConditionToGroup(s, "g1", { id: "c2", columnId: "bank", operator: "is", value: "HSBC" })
    expect(s.groups[0].conditions).toHaveLength(2)
    s = updateConditionInGroup(s, "g1", { id: "c2", columnId: "bank", operator: "is", value: "Citi" })
    expect(s.groups[0].conditions[1].value).toBe("Citi")
    s = removeConditionFromGroup(s, "g1", "c2")
    expect(s.groups[0].conditions).toHaveLength(1)
  })
  it("removing the last condition drops the group", () => {
    let s = addGroup(emptyFilterState(), "g1", "c1", defs)
    s = removeConditionFromGroup(s, "g1", "c1")
    expect(s.groups).toHaveLength(0)
  })
  it("setGroupCombinator / setTopCombinator / removeGroup", () => {
    let s = addGroup(emptyFilterState(), "g1", "c1", defs)
    s = setGroupCombinator(s, "g1", "or")
    expect(s.groups[0].combinator).toBe("or")
    s = setTopCombinator(s, "or")
    expect(s.combinator).toBe("or")
    s = removeGroup(s, "g1")
    expect(s.groups).toHaveLength(0)
  })
  it("normalizeFilterState drops unknown-column conditions and prunes empty groups", () => {
    const state: FilterState = { combinator: "and", groups: [
      { id: "g1", combinator: "and", conditions: [
        { id: "a", columnId: "bank", operator: "is", value: "HSBC" },
        { id: "b", columnId: "ghost", operator: "is", value: "x" },
      ] },
      { id: "g2", combinator: "and", conditions: [
        { id: "c", columnId: "ghost", operator: "is", value: "x" },
      ] },
    ] }
    const result = normalizeFilterState(state, ["bank"])
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].conditions.map((c) => c.id)).toEqual(["a"])
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test filter-utils`
Expected: FAIL (new functions undefined; "greater than" mismatch).

- [ ] **Step 4: Update `filter-utils.ts`**

Update `DEFAULT_OPERATORS`:
```ts
const DEFAULT_OPERATORS: Record<FilterType, FilterOperator[]> = {
  text: ["contains", "doesNotContain", "equals", "isNot", "startsWith"],
  number: ["eq", "ne", "gt", "lt", "between"],
  select: ["isAnyOf", "isNoneOf", "is"],
  date: ["before", "after", "dateBetween"],
}
```

Replace `OPERATOR_LABELS`:
```ts
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: "contains",
  doesNotContain: "does not contain",
  equals: "is",
  isNot: "is not",
  startsWith: "starts with",
  eq: "equals",
  ne: "not equal",
  gt: "greater than",
  lt: "less than",
  between: "between",
  is: "is",
  isAnyOf: "is any of",
  isNoneOf: "is none of",
  before: "before",
  after: "after",
  dateBetween: "between",
}
```

In `evaluateCondition`, add cases (place `doesNotContain` and `isNot` near the text cases, `isNoneOf` near `isAnyOf`):
```ts
    case "doesNotContain":
      return !text.includes(String(value).toLowerCase())
    case "isNot":
      return String(cellValue ?? "").toLowerCase() !== String(value).toLowerCase()
    case "isNoneOf":
      return !(value as string[]).map(String).includes(String(cellValue ?? ""))
```

Add at the end of the file (new exports; keep existing helpers):
```ts
export function isConditionComplete(condition: FilterCondition): boolean {
  return !isEmptyValue(condition.value)
}

// Note: `isEmpty` already exists in this module for the same check. If it is
// named `isEmpty`, call it here instead of `isEmptyValue`.
```
(If the existing internal helper is named `isEmpty`, use that name — do not introduce a duplicate. Rename this call accordingly.)

```ts
export function evaluateGroup(
  group: FilterGroup,
  get: (columnId: string) => unknown,
): boolean {
  const active = group.conditions.filter(isConditionComplete)
  if (active.length === 0) return true
  const results = active.map((c) =>
    evaluateCondition(get(c.columnId), c.operator, c.value),
  )
  return group.combinator === "and"
    ? results.every(Boolean)
    : results.some(Boolean)
}

export function evaluateFilterState(
  state: FilterState,
  get: (columnId: string) => unknown,
): boolean {
  const active = state.groups.filter((g) =>
    g.conditions.some(isConditionComplete),
  )
  if (active.length === 0) return true
  const results = active.map((g) => evaluateGroup(g, get))
  return state.combinator === "and"
    ? results.every(Boolean)
    : results.some(Boolean)
}

export function countActiveConditions(state: FilterState): number {
  return state.groups.reduce(
    (sum, g) => sum + g.conditions.filter(isConditionComplete).length,
    0,
  )
}

export function emptyFilterState(): FilterState {
  return { combinator: "and", groups: [] }
}

export function newGroup(
  id: string,
  conditionId: string,
  filterDefs: FilterDef[],
): FilterGroup {
  return {
    id,
    combinator: "and",
    conditions: [createCondition(filterDefs, conditionId)],
  }
}

export function addGroup(
  state: FilterState,
  groupId: string,
  conditionId: string,
  filterDefs: FilterDef[],
): FilterState {
  return { ...state, groups: [...state.groups, newGroup(groupId, conditionId, filterDefs)] }
}

function mapGroup(
  state: FilterState,
  groupId: string,
  fn: (g: FilterGroup) => FilterGroup,
): FilterState {
  return { ...state, groups: state.groups.map((g) => (g.id === groupId ? fn(g) : g)) }
}

export function addConditionToGroup(
  state: FilterState,
  groupId: string,
  condition: FilterCondition,
): FilterState {
  return mapGroup(state, groupId, (g) => ({
    ...g,
    conditions: [...g.conditions, condition],
  }))
}

export function updateConditionInGroup(
  state: FilterState,
  groupId: string,
  condition: FilterCondition,
): FilterState {
  return mapGroup(state, groupId, (g) => ({
    ...g,
    conditions: g.conditions.map((c) => (c.id === condition.id ? condition : c)),
  }))
}

export function removeConditionFromGroup(
  state: FilterState,
  groupId: string,
  conditionId: string,
): FilterState {
  const next = mapGroup(state, groupId, (g) => ({
    ...g,
    conditions: g.conditions.filter((c) => c.id !== conditionId),
  }))
  // Drop a group that has no conditions left.
  return { ...next, groups: next.groups.filter((g) => g.conditions.length > 0) }
}

export function removeGroup(state: FilterState, groupId: string): FilterState {
  return { ...state, groups: state.groups.filter((g) => g.id !== groupId) }
}

export function setGroupCombinator(
  state: FilterState,
  groupId: string,
  combinator: Combinator,
): FilterState {
  return mapGroup(state, groupId, (g) => ({ ...g, combinator }))
}

export function setTopCombinator(
  state: FilterState,
  combinator: Combinator,
): FilterState {
  return { ...state, combinator }
}

export function normalizeFilterState(
  state: FilterState,
  filterableIds: string[],
): FilterState {
  const allowed = new Set(filterableIds)
  const groups = state.groups
    .map((g) => ({
      ...g,
      conditions: g.conditions.filter((c) => allowed.has(c.columnId)),
    }))
    .filter((g) => g.conditions.length > 0)
  return { ...state, groups }
}
```

Add the needed imports at the top of `filter-utils.ts`:
```ts
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
```

- [ ] **Step 5: Run to verify it passes + typecheck**

Run: `pnpm test filter-utils && pnpm typecheck`
Expected: PASS. (Other suites still green because v1 helpers + `initialFilters` remain.) If `pnpm test` (full) shows a v1 label assertion failing elsewhere — e.g. a grouped-data-table test expecting an operator label that changed — update that assertion to the new label. The select `is` label is unchanged ("is"), so the existing "Ccy is USD" chip test (still present pre-Task-3) stays valid.

- [ ] **Step 6: Commit**

```bash
git add components/grouped-data-table/types.ts components/grouped-data-table/filter-utils.ts components/grouped-data-table/filter-utils.test.ts
git commit -m "feat: add filter-group model, negation operators, and tree evaluation"
```

---

### Task 2: Reusable `MultiSelect` (TDD)

**Files:**
- Create: `components/grouped-data-table/multi-select.tsx`
- Test: `components/grouped-data-table/multi-select.test.tsx`

- [ ] **Step 1: Write the failing test** at `components/grouped-data-table/multi-select.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { MultiSelectContent, multiSelectLabel } from "./multi-select"

const options = [
  { label: "HSBC", value: "HSBC" },
  { label: "Citi", value: "Citi" },
]

describe("multiSelectLabel", () => {
  it("shows placeholder when empty and a count otherwise", () => {
    expect(multiSelectLabel([], "Select…")).toBe("Select…")
    expect(multiSelectLabel(["HSBC"], "Select…")).toBe("1 selected")
    expect(multiSelectLabel(["HSBC", "Citi"], "Select…")).toBe("2 selected")
  })
})

describe("MultiSelectContent", () => {
  it("adds a value when its checkbox is toggled on", async () => {
    const onChange = vi.fn()
    render(
      <MultiSelectContent options={options} selected={[]} onChange={onChange} />,
    )
    await userEvent.click(screen.getByRole("checkbox", { name: "HSBC" }))
    expect(onChange).toHaveBeenCalledWith(["HSBC"])
  })
  it("removes a value when its checkbox is toggled off", async () => {
    const onChange = vi.fn()
    render(
      <MultiSelectContent
        options={options}
        selected={["HSBC", "Citi"]}
        onChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole("checkbox", { name: "Citi" }))
    expect(onChange).toHaveBeenCalledWith(["HSBC"])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test multi-select`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `multi-select.tsx`**
```tsx
"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type MultiSelectOption = { label: string; value: string }

type MultiSelectProps = {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
}

export function multiSelectLabel(selected: string[], placeholder: string): string {
  return selected.length === 0 ? placeholder : `${selected.length} selected`
}

export function MultiSelectContent({
  options,
  selected,
  onChange,
}: Pick<MultiSelectProps, "options" | "selected" | "onChange">) {
  function toggle(value: string, checked: boolean) {
    onChange(
      checked ? [...selected, value] : selected.filter((v) => v !== value),
    )
  }
  return (
    <div className="flex max-h-64 flex-col gap-1 overflow-auto">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm select-none hover:bg-muted"
        >
          <Checkbox
            checked={selected.includes(opt.value)}
            onCheckedChange={(checked) => toggle(opt.value, checked === true)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select…",
  ariaLabel,
  className,
}: MultiSelectProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={(p) => (
          <Button
            {...p}
            type="button"
            variant="outline"
            size="sm"
            aria-label={ariaLabel}
            className={cn("h-8 justify-between gap-2 font-normal", className)}
          />
        )}
      >
        <span className={cn(selected.length === 0 && "text-muted-foreground")}>
          {multiSelectLabel(selected, placeholder)}
        </span>
        <Check className="size-3 opacity-0" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56">
        <MultiSelectContent
          options={options}
          selected={selected}
          onChange={onChange}
        />
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 4: Run to verify it passes + typecheck**

Run: `pnpm test multi-select && pnpm typecheck`
Expected: PASS. If the base-ui `Checkbox` accessible name doesn't resolve from the wrapping `<label>` text, mirror the working pattern from `dimension-picker.tsx` (label wraps Checkbox, no `aria-label` on the Checkbox) — it should already match.

- [ ] **Step 5: Commit**

```bash
git add components/grouped-data-table/multi-select.tsx components/grouped-data-table/multi-select.test.tsx
git commit -m "feat: add reusable MultiSelect dropdown"
```

---

### Task 3: Migrate hook + filter builder + toolbar to FilterState (coupled, TDD)

This is the breaking migration; it is committed once, green. Do every step before committing.

**Files:**
- Modify: `components/grouped-data-table/use-grouped-table.ts`
- Modify: `components/grouped-data-table/use-grouped-table.test.tsx`
- Rewrite: `components/grouped-data-table/filter-builder.tsx`
- Rewrite: `components/grouped-data-table/filter-builder.test.tsx`
- Modify: `components/grouped-data-table/grouped-data-table.tsx`
- Modify: `components/grouped-data-table/grouped-data-table.test.tsx`
- Delete: `components/grouped-data-table/filter-chips.tsx`, `components/grouped-data-table/filter-chips.test.tsx`
- Modify: `components/grouped-data-table/types.ts` (remove `initialFilters`)
- Modify: `components/grouped-data-table/index.ts`
- Modify: `app/(examples)/accounts/accounts-table.tsx`

- [ ] **Step 1: Rewrite `use-grouped-table.ts` filter wiring**

Remove the v1 filter wiring (`filterConditions` state, `conditionsToColumnFilters` derivation, `makeFilterFn`/`columnsWithFilters` injection, `normalizeConditions` usage) and the `columnFilters` from `state`. Replace with `filterState` + pre-filtered data:

Imports — replace the `./filter-utils` import block with:
```ts
import { evaluateFilterState, normalizeFilterState } from "./filter-utils"
import { emptyFilterState } from "./filter-utils"
import type { FilterState } from "./types"
```
Remove the now-unused `import type { FilterCondition, FilterDef } ...` if those are unused (keep `FilterDef` only if still referenced; `EMPTY_FILTER_COLUMNS` stays for `filterableColumns` default).

Update the destructured props: replace `initialFilters = []` with `initialFilterState`.

Replace the filter state block with:
```ts
const filterableIds = React.useMemo(
  () => filterableColumns.map((f) => f.id),
  [filterableColumns],
)

const [filterState, setFilterStateRaw] = React.useState<FilterState>(() =>
  normalizeFilterState(initialFilterState ?? emptyFilterState(), filterableIds),
)

const setFilterState = React.useCallback(
  (next: FilterState | ((prev: FilterState) => FilterState)) => {
    setFilterStateRaw((prev) =>
      normalizeFilterState(typeof next === "function" ? next(prev) : next, filterableIds),
    )
  },
  [filterableIds],
)

const filteredData = React.useMemo(() => {
  if (filterState.groups.length === 0) return data
  return data.filter((row) =>
    evaluateFilterState(
      filterState,
      (columnId) => (row as Record<string, unknown>)[columnId],
    ),
  )
}, [data, filterState])
```

Use `filteredData` as the table's `data`. Restore `allColumns` to the simple `[groupColumnDef, ...columns]` (remove `columnsWithFilters`). Remove `columnFilters` from `state`. Update the result type + return:
```ts
export type UseGroupedTableResult<TData> = {
  table: Table<TData>
  grouping: GroupingState
  setGrouping: (next: GroupingState) => void
  filterState: FilterState
  setFilterState: (next: FilterState | ((prev: FilterState) => FilterState)) => void
}
```
```ts
const table = useReactTable<TData>({
  data: filteredData,
  columns: allColumns,
  ...
})
...
return { table, grouping, setGrouping, filterState, setFilterState }
```

- [ ] **Step 2: Update `use-grouped-table.test.tsx`**

Replace the two v1 filter tests (the `initialFilters`/`setFilterConditions` ones added in the prior plan) with FilterState equivalents:
```tsx
  it("pre-filters rows from initialFilterState and recomputes groups", () => {
    const { result } = renderHook(() =>
      useGroupedTable<Acct>({
        data,
        columns,
        groupableDimensions: [{ id: "entity", label: "Entity" }],
        groupColumn: { renderLeaf: (row) => row.original.id },
        initialGrouping: ["entity"],
        enablePagination: false,
        filterableColumns: [{ id: "currency", label: "Ccy", type: "select" }],
        initialFilterState: {
          combinator: "and",
          groups: [
            { id: "g1", combinator: "and", conditions: [
              { id: "f1", columnId: "currency", operator: "is", value: "EUR" },
            ] },
          ],
        },
      }),
    )
    const leafCount = result.current.table
      .getRowModel()
      .rows.flatMap((r) => r.getLeafRows())
      .filter((r) => !r.getIsGrouped()).length
    expect(leafCount).toBe(2) // ids 2 and 3 are EUR
  })

  it("an OR group keeps rows matching either condition", () => {
    const { result } = renderHook(() =>
      useGroupedTable<Acct>({
        data,
        columns,
        groupableDimensions: [{ id: "entity", label: "Entity" }],
        groupColumn: { renderLeaf: (row) => row.original.id },
        enablePagination: false,
        filterableColumns: [
          { id: "currency", label: "Ccy", type: "select" },
          { id: "bank", label: "Bank", type: "select" },
        ],
        initialFilterState: {
          combinator: "and",
          groups: [
            { id: "g1", combinator: "or", conditions: [
              { id: "f1", columnId: "currency", operator: "is", value: "USD" },
              { id: "f2", columnId: "bank", operator: "is", value: "HSBC" },
            ] },
          ],
        },
      }),
    )
    // id1 USD/Citi, id2 EUR/HSBC, id3 EUR/HSBC → USD OR HSBC = all 3.
    const leafCount = result.current.table
      .getRowModel()
      .rows.flatMap((r) => r.getLeafRows())
      .filter((r) => !r.getIsGrouped()).length
    expect(leafCount).toBe(3)
  })

  it("setFilterState normalizes away unknown-column conditions", () => {
    const { result } = setup()
    act(() =>
      result.current.setFilterState({
        combinator: "and",
        groups: [
          { id: "g1", combinator: "and", conditions: [
            { id: "f1", columnId: "ghost", operator: "is", value: "x" },
          ] },
        ],
      }),
    )
    expect(result.current.filterState.groups).toEqual([])
  })
```
(The fixture `data`/`columns` already has `currency` USD/EUR/EUR and `bank`. Confirm `bank` values in the fixture; if the fixture rows lack a `bank` field, add `bank` to the fixture rows: id1 Citi, id2 HSBC, id3 HSBC.)

- [ ] **Step 3: Rewrite `filter-builder.tsx`** (controlled on `FilterState`)
```tsx
"use client"

import * as React from "react"
import { Filter, Plus, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { MultiSelect } from "./multi-select"
import {
  addConditionToGroup,
  addGroup,
  countActiveConditions,
  createCondition,
  OPERATOR_LABELS,
  operatorsForDef,
  removeConditionFromGroup,
  setGroupCombinator,
  setTopCombinator,
  updateConditionInGroup,
  withColumn,
  withOperator,
  withValue,
} from "./filter-utils"
import type {
  Combinator,
  FilterCondition,
  FilterDef,
  FilterOperator,
  FilterGroup,
  FilterState,
  FilterValue,
} from "./types"

type FilterBuilderProps = {
  filterableColumns: FilterDef[]
  filterState: FilterState
  onFilterStateChange: (next: FilterState) => void
}

const COMBINATOR_OPTIONS: { value: Combinator; label: string }[] = [
  { value: "and", label: "and" },
  { value: "or", label: "or" },
]

function newId(): string {
  return crypto.randomUUID()
}

function defFor(columns: FilterDef[], columnId: string): FilterDef {
  return columns.find((d) => d.id === columnId) ?? columns[0]
}

function CombinatorSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: Combinator
  onChange: (next: Combinator) => void
  ariaLabel: string
}) {
  return (
    <Select value={value} onValueChange={(v) => v != null && onChange(v as Combinator)}>
      <SelectTrigger aria-label={ariaLabel} className="h-7 w-20 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COMBINATOR_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ConditionValueInput({
  def,
  condition,
  onValueChange,
}: {
  def: FilterDef
  condition: FilterCondition
  onValueChange: (value: FilterValue) => void
}) {
  const ariaLabel = `Filter value for ${def.label}`
  const op = condition.operator

  if (def.type === "select" && def.options && def.options.length > 0) {
    if (op === "isAnyOf" || op === "isNoneOf") {
      const selected = Array.isArray(condition.value)
        ? (condition.value as string[])
        : []
      return (
        <MultiSelect
          options={def.options}
          selected={selected}
          onChange={(next) => onValueChange(next)}
          ariaLabel={ariaLabel}
          placeholder="Select…"
          className="w-full"
        />
      )
    }
    return (
      <Select
        value={condition.value == null ? "" : String(condition.value)}
        onValueChange={(v) => onValueChange((v ?? "") as FilterValue)}
      >
        <SelectTrigger aria-label={ariaLabel} className="h-8 w-full">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {def.options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (op === "between" || op === "dateBetween") {
    const pair = Array.isArray(condition.value)
      ? condition.value.map((v) => String(v ?? ""))
      : ["", ""]
    const inputType = def.type === "date" ? "date" : "number"
    return (
      <div className="flex items-center gap-1">
        <Input
          type={inputType}
          aria-label={`${ariaLabel} from`}
          className="h-8"
          value={pair[0] ?? ""}
          onChange={(e) => onValueChange([e.target.value, pair[1] ?? ""])}
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type={inputType}
          aria-label={`${ariaLabel} to`}
          className="h-8"
          value={pair[1] ?? ""}
          onChange={(e) => onValueChange([pair[0] ?? "", e.target.value])}
        />
      </div>
    )
  }

  const inputType =
    def.type === "number" ? "number" : def.type === "date" ? "date" : "text"
  return (
    <Input
      type={inputType}
      aria-label={ariaLabel}
      className="h-8"
      value={condition.value == null ? "" : String(condition.value)}
      onChange={(e) => onValueChange(e.target.value)}
    />
  )
}

function ConditionRow({
  filterableColumns,
  group,
  condition,
  index,
  onState,
}: {
  filterableColumns: FilterDef[]
  group: FilterGroup
  condition: FilterCondition
  index: number
  onState: (fn: (s: FilterState) => FilterState) => void
}) {
  const def = defFor(filterableColumns, condition.columnId)
  const operators = operatorsForDef(def)
  const update = (next: FilterCondition) =>
    onState((s) => updateConditionInGroup(s, group.id, next))

  return (
    <div className="flex items-start gap-1.5">
      <div className="w-14 shrink-0 pt-1.5 text-right text-xs text-muted-foreground">
        {index === 0 ? "Where" : null}
      </div>
      <Select
        value={condition.columnId}
        onValueChange={(v) =>
          v != null && update(withColumn(condition, String(v), filterableColumns))
        }
      >
        <SelectTrigger aria-label="Filter column" className="h-8 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {filterableColumns.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={condition.operator}
        onValueChange={(v) =>
          v != null && update(withOperator(condition, v as FilterOperator))
        }
      >
        <SelectTrigger aria-label="Filter operator" className="h-8 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1">
        <ConditionValueInput
          def={def}
          condition={condition}
          onValueChange={(value) => update(withValue(condition, value))}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Remove filter"
        onClick={() =>
          onState((s) => removeConditionFromGroup(s, group.id, condition.id))
        }
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}

export function FilterBuilderContent({
  filterableColumns,
  filterState,
  onFilterStateChange,
}: FilterBuilderProps) {
  const onState = (fn: (s: FilterState) => FilterState) =>
    onFilterStateChange(fn(filterState))

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Filters</p>

      {filterState.groups.length === 0 && (
        <p className="text-sm text-muted-foreground">No filters applied.</p>
      )}

      {filterState.groups.map((group, gi) => (
        <React.Fragment key={group.id}>
          {gi > 0 && (
            <div className="flex justify-start pl-14">
              {gi === 1 ? (
                <CombinatorSelect
                  value={filterState.combinator}
                  onChange={(c) => onState((s) => setTopCombinator(s, c))}
                  ariaLabel="Combine groups with"
                />
              ) : (
                <span className="px-2 text-xs text-muted-foreground">
                  {filterState.combinator}
                </span>
              )}
            </div>
          )}
          <div className="space-y-2 rounded-md border p-2">
            {group.conditions.map((condition, ci) => (
              <div key={condition.id} className="space-y-2">
                {ci === 1 && (
                  <div className="pl-14">
                    <CombinatorSelect
                      value={group.combinator}
                      onChange={(c) =>
                        onState((s) => setGroupCombinator(s, group.id, c))
                      }
                      ariaLabel="Combine conditions with"
                    />
                  </div>
                )}
                {ci > 1 && (
                  <div className="pl-14">
                    <span className="px-2 text-xs text-muted-foreground">
                      {group.combinator}
                    </span>
                  </div>
                )}
                <ConditionRow
                  filterableColumns={filterableColumns}
                  group={group}
                  condition={condition}
                  index={ci}
                  onState={onState}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-14 gap-1"
              onClick={() =>
                onState((s) =>
                  addConditionToGroup(
                    s,
                    group.id,
                    createCondition(filterableColumns, newId()),
                  ),
                )
              }
            >
              <Plus className="size-4" />
              Add filter
            </Button>
          </div>
        </React.Fragment>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() =>
          onState((s) => addGroup(s, newId(), newId(), filterableColumns))
        }
      >
        <Plus className="size-4" />
        Add filter group
      </Button>
    </div>
  )
}

export function FilterPopover(props: FilterBuilderProps) {
  const count = countActiveConditions(props.filterState)
  return (
    <Popover>
      <PopoverTrigger
        render={(p) => (
          <Button {...p} variant="outline" size="sm" className="gap-2" />
        )}
      >
        <Filter className="size-4" />
        Filters
        {count > 0 && <Badge variant="secondary">{count}</Badge>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[34rem]">
        <FilterBuilderContent {...props} />
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 4: Rewrite `filter-builder.test.tsx`**
```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FilterBuilderContent } from "./filter-builder"
import type { FilterDef, FilterState } from "./types"

const defs: FilterDef[] = [
  { id: "bank", label: "Bank", type: "text" },
  { id: "balance", label: "Balance", type: "number" },
]

const oneGroup: FilterState = {
  combinator: "and",
  groups: [
    { id: "g1", combinator: "and", conditions: [
      { id: "c1", columnId: "bank", operator: "contains", value: null },
    ] },
  ],
}

describe("FilterBuilderContent", () => {
  it("adds a group when there are none and 'Add filter group' is clicked", async () => {
    const onChange = vi.fn()
    render(
      <FilterBuilderContent
        filterableColumns={defs}
        filterState={{ combinator: "and", groups: [] }}
        onFilterStateChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /add filter group/i }))
    const next = onChange.mock.calls[0][0] as FilterState
    expect(next.groups).toHaveLength(1)
    expect(next.groups[0].conditions).toHaveLength(1)
  })

  it("adds a condition to an existing group", async () => {
    const onChange = vi.fn()
    render(
      <FilterBuilderContent
        filterableColumns={defs}
        filterState={oneGroup}
        onFilterStateChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /add filter$/i }))
    const next = onChange.mock.calls[0][0] as FilterState
    expect(next.groups[0].conditions).toHaveLength(2)
  })

  it("updates the value as the user types", async () => {
    const onChange = vi.fn()
    render(
      <FilterBuilderContent
        filterableColumns={defs}
        filterState={oneGroup}
        onFilterStateChange={onChange}
      />,
    )
    await userEvent.type(screen.getByLabelText("Filter value for Bank"), "H")
    const next = onChange.mock.calls.at(-1)![0] as FilterState
    expect(next.groups[0].conditions[0].value).toBe("H")
  })

  it("removes a condition (and its now-empty group)", async () => {
    const onChange = vi.fn()
    render(
      <FilterBuilderContent
        filterableColumns={defs}
        filterState={oneGroup}
        onFilterStateChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /remove filter/i }))
    const next = onChange.mock.calls[0][0] as FilterState
    expect(next.groups).toHaveLength(0)
  })
})
```

- [ ] **Step 5: Update `grouped-data-table.tsx`** (toolbar; no chips)

Remove imports of `FilterChips` and `removeCondition`. Change the hook destructure and toolbar:
```ts
const { table, grouping, setGrouping, filterState, setFilterState } =
  useGroupedTable(props)
```
Replace the toolbar block with (drop the chips row entirely):
```tsx
<div className="flex items-center gap-2">
  {props.filterableColumns && props.filterableColumns.length > 0 && (
    <FilterPopover
      filterableColumns={props.filterableColumns}
      filterState={filterState}
      onFilterStateChange={setFilterState}
    />
  )}
  <DimensionPicker
    dimensions={props.groupableDimensions}
    grouping={grouping}
    onGroupingChange={setGrouping}
  />
</div>
```
Keep the `import { FilterPopover } from "./filter-builder"`.

- [ ] **Step 6: Update `grouped-data-table.test.tsx`**

Replace the v1 "applies initialFilters and shows a removable chip" test with:
```tsx
  it("applies initialFilterState and recomputes group counts (no chips row)", () => {
    render(
      <GroupedDataTable<Acct>
        data={data}
        columns={columns}
        groupableDimensions={[{ id: "entity", label: "Entity" }]}
        initialGrouping={["entity"]}
        enablePagination={false}
        filterableColumns={[{ id: "currency", label: "Ccy", type: "select" }]}
        initialFilterState={{
          combinator: "and",
          groups: [
            { id: "g1", combinator: "and", conditions: [
              { id: "f1", columnId: "currency", operator: "is", value: "USD" },
            ] },
          ],
        }}
        groupColumn={{ header: "Account", renderLeaf: (row) => row.original.id }}
      />,
    )
    expect(screen.getByText("Coffee Inc")).toBeInTheDocument()
    expect(screen.getByText("(1)")).toBeInTheDocument()
    expect(screen.queryByText("Holding BV")).not.toBeInTheDocument()
    // Active-filter count badge is shown on the Filters trigger.
    expect(screen.getByRole("button", { name: /filters/i })).toBeInTheDocument()
  })
```

- [ ] **Step 7: Delete the chips files**

```bash
git rm components/grouped-data-table/filter-chips.tsx components/grouped-data-table/filter-chips.test.tsx
```

- [ ] **Step 8: Remove `initialFilters` from `types.ts`**

Delete the `initialFilters?: FilterCondition[]` line (now replaced by `initialFilterState`).

- [ ] **Step 9: Update `index.ts`**

- Remove exports of `FilterChips`, and the v1 pure helpers that no longer exist or are dead (`conditionsToColumnFilters`, `makeFilterFn`, `removeCondition`, `replaceCondition`, `normalizeConditions`) — delete those v1 helpers from `filter-utils.ts` as well (they are unused after migration; confirm with a grep).
- Add exports:
```ts
export { MultiSelect, MultiSelectContent } from "./multi-select"
export {
  type Combinator,
  type FilterGroup,
  type FilterState,
} from "./types"
export {
  evaluateFilterState,
  evaluateGroup,
  emptyFilterState,
  countActiveConditions,
  isConditionComplete,
  addGroup,
  addConditionToGroup,
  updateConditionInGroup,
  removeConditionFromGroup,
  removeGroup,
  setGroupCombinator,
  setTopCombinator,
  normalizeFilterState,
} from "./filter-utils"
```
Keep existing valid exports (`describeCondition`, `operatorsForDef`, `OPERATOR_LABELS`, `defaultOperatorsFor`, `evaluateCondition`, `createCondition`, `withColumn`, `withOperator`, `withValue`, the components, the v2 types). Remove the v1-only ones noted above.

- [ ] **Step 10: Update `accounts-table.tsx`**

No `initialFilters` is currently passed, so nothing to change functionally. Confirm it still typechecks (the prop was optional and unused). Optionally seed a demo:
```tsx
// (optional) import type { FilterState } from "@/components/grouped-data-table"
```
Leave default (no initial filters) unless demoing.

- [ ] **Step 11: Run the full suite, typecheck, build**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: ALL green; `/accounts` compiles. Fix any dangling references to removed v1 symbols until green.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: migrate filtering to AND/OR filter groups (FilterState)"
```

---

### Task 4: Group-by dimension MultiSelect (TDD)

**Files:**
- Modify: `components/grouped-data-table/dimension-picker.tsx`
- Modify: `components/grouped-data-table/dimension-picker.test.tsx`

- [ ] **Step 1: Update the test** — replace the checklist toggle test with a MultiSelect-based one (keep the existing drag-reorder/render tests). Add:
```tsx
import { MultiSelectContent } from "./multi-select"
```
The picker now renders a `MultiSelect` dropdown for selection; its inner list is `MultiSelectContent`. Replace the "adds a dimension when checked" / "removes a dimension when unchecked" tests with:
```tsx
  it("adds a dimension via the multi-select list", async () => {
    const onGroupingChange = vi.fn()
    render(
      <DimensionPickerContent
        dimensions={dimensions}
        grouping={[]}
        onGroupingChange={onGroupingChange}
      />,
    )
    await userEvent.click(screen.getByRole("checkbox", { name: "Entity" }))
    expect(onGroupingChange).toHaveBeenCalledWith(["entity"])
  })

  it("removes a dimension via the multi-select list", async () => {
    const onGroupingChange = vi.fn()
    render(
      <DimensionPickerContent
        dimensions={dimensions}
        grouping={["entity", "bank"]}
        onGroupingChange={onGroupingChange}
      />,
    )
    await userEvent.click(screen.getByRole("checkbox", { name: "Bank" }))
    expect(onGroupingChange).toHaveBeenCalledWith(["entity"])
  })
```
Keep the existing "renders selected dimensions as reorderable hierarchy items" test.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test dimension-picker`
Expected: FAIL until the picker uses `MultiSelectContent`.

- [ ] **Step 3: Update `dimension-picker.tsx`** — replace the inline checklist (the `<label><Checkbox/></label>` block) with the shared multi-select list, keeping the `@dnd-kit` reorder list. In `DimensionPickerContent`, replace the "Dimensions" checklist section with:
```tsx
import { MultiSelect, MultiSelectContent } from "./multi-select"
```
Render (in the popover content, `DimensionPickerContent` body) the dimensions as `MultiSelectContent` (so the popover shows the list directly — it is already inside the Group-by popover) sourced from `dimensions` mapped to `{ label, value }`:
```tsx
<div className="space-y-1.5">
  <p className="text-xs font-medium text-muted-foreground">Dimensions</p>
  <MultiSelectContent
    options={dimensions.map((d) => ({ label: d.label, value: d.id }))}
    selected={grouping}
    onChange={onGroupingChange}
  />
</div>
```
Keep the existing "Hierarchy (drag to reorder)" `DndContext`/`SortableContext` block below, unchanged. (`onGroupingChange(next)` from MultiSelectContent will be normalized by the hook; order is preserved by the existing reorder list. When selecting a new dimension, it appends to `grouping`; deselecting removes it.)

Remove the now-unused `Checkbox` import from `dimension-picker.tsx` if nothing else uses it.

- [ ] **Step 4: Run to verify it passes + full suite + typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/grouped-data-table/dimension-picker.tsx components/grouped-data-table/dimension-picker.test.tsx
git commit -m "feat: group-by dimension picker uses shared MultiSelect list"
```

---

### Task 5: Final verification gate

**Files:** none

- [ ] **Step 1: Full check suite**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: typecheck PASS; lint 0 errors (the known React-Compiler `useReactTable` warnings are acceptable); all tests PASS; `/accounts` builds.

- [ ] **Step 2: Confirm clean tree**

Run: `git status`
Expected: clean on `feat/grouped-data-table`.

(Browser verification — AND vs OR groups, "N selected" multi-select, group-by dropdown + reorder — is performed by the controller after the tasks complete.)

---

## Self-Review Notes (author checklist — verified)

- **Spec coverage:** model (Task 1); negation operators + readable labels (Task 1); evaluateGroup/evaluateFilterState pre-filter (Task 1 + hook Task 3); tree mutation helpers (Task 1); MultiSelect "N selected" (Task 2); filter-builder groups + AND/OR connectors + MultiSelect value (Task 3); chips removed + badge = active count (Task 3); group-by MultiSelect + drag list (Task 4); barrel exports (Task 3 Step 9); example (Task 3 Step 10).
- **Type consistency:** `FilterState`/`FilterGroup`/`Combinator` used identically; hook returns `{ table, grouping, setGrouping, filterState, setFilterState }`; builder props `{ filterableColumns, filterState, onFilterStateChange }`; tree helpers named `addGroup`/`addConditionToGroup`/`updateConditionInGroup`/`removeConditionFromGroup`/`removeGroup`/`setGroupCombinator`/`setTopCombinator`/`normalizeFilterState`/`countActiveConditions`/`emptyFilterState`/`newGroup`/`isConditionComplete`/`evaluateGroup`/`evaluateFilterState`; condition editors reused (`createCondition`/`withColumn`/`withOperator`/`withValue`/`operatorsForDef`).
- **Green ordering:** Tasks 1–2 additive (suite stays green); Task 3 is the single coupled migration committed at green; v1 dead helpers removed in Task 3 Step 9.
- **base-ui caveat:** Select/Popover don't open in jsdom → builder/MultiSelect tests use Inputs/Checkbox-in-list + pure helpers; combinator/column/operator Select changes covered by pure-helper tests + browser.
- **No placeholders:** complete code in each step; the one conditional ("if internal empty-check is named `isEmpty`") is a naming reconciliation, not a gap.
- **Out of scope (unchanged):** >2-level nesting, per-pair combinators, controlled-apply/MCP, registry, getRowId.
```
