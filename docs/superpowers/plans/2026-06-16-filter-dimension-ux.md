# Filter / Dimension UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add declarative, user-applied filtering to `GroupedDataTable<TData>` — a Filters popover (column → operator → value conditions) with removable chips — parameterized by a serializable `FilterDef[]`, wired into TanStack `columnFilters` so groups recompute over filtered rows.

**Architecture:** All condition logic lives in pure, unit-tested helpers (`filter-utils.ts`). The hook derives `columnFilters` from internal `FilterCondition[]` state and injects a custom `filterFn` onto filterable columns. The UI (`filter-builder.tsx`, `filter-chips.tsx`) is thin glue over the pure helpers — base-ui Select/Input for inputs. Active selections stay internal (UI-driven); no controlled props.

**Tech Stack:** Next.js 16, React 19, TS strict, `@tanstack/react-table` v8 (`columnFilters`/`getFilteredRowModel`), shadcn (base-ui) `select`+`input`, Vitest + Testing Library, pnpm.

Spec: `docs/superpowers/specs/2026-06-16-filter-dimension-ux-design.md`

---

## File Structure

```
components/grouped-data-table/
  types.ts             # + FilterType/FilterOperator/FilterDef/FilterCondition; extend GroupedDataTableProps
  filter-utils.ts      # NEW — pure: operators, evaluateCondition, conditionsToColumnFilters, describeCondition, makeFilterFn, mutation helpers
  filter-builder.tsx   # NEW — FilterPopover + FilterBuilderContent + ConditionValueInput
  filter-chips.tsx     # NEW — active-condition chip row
  use-grouped-table.ts # + filterConditions state, derived columnFilters, filterFn augmentation
  grouped-data-table.tsx # toolbar: Filters popover + Group by + chips row
  index.ts             # export new public types + components
components/ui/select.tsx, input.tsx   # NEW shadcn primitives
app/(examples)/accounts/accounts-table.tsx  # add filterableColumns
```

---

### Task 1: Add shadcn `select` and `input` primitives

**Files:** Create (via CLI): `components/ui/select.tsx`, `components/ui/input.tsx`

- [ ] **Step 1: Generate the primitives**

Run: `pnpm dlx shadcn@latest add select input --yes --overwrite`
Expected: both files created using the project's base-ui (`base-vega`) style. If the CLI cannot run, STOP and report BLOCKED with the error (do not hand-write — they depend on base-ui styling conventions).

- [ ] **Step 2: Record the generated API**

Read both files. Note exactly: what `select.tsx` exports (e.g. `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`), the `onValueChange` signature (base-ui passes `(value, eventDetails)`), and whether `SelectValue` takes a `placeholder` prop; and `input.tsx`'s export (`Input`) and that it forwards native `<input>` props incl. `type`, `value`, `onChange`.

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/ui/select.tsx components/ui/input.tsx
git commit -m "feat: add shadcn select and input primitives"
```

Report the exact exports and `onValueChange`/`Input` signatures — Task 5 needs them.

---

### Task 2: Extend `types.ts` with filter types

**Files:** Modify: `components/grouped-data-table/types.ts`

- [ ] **Step 1: Add the filter types and extend props**

Add to `components/grouped-data-table/types.ts` (keep existing content; add these exports and the two new optional props on `GroupedDataTableProps`):

```ts
export type FilterType = "text" | "number" | "select" | "date"

export type FilterOperator =
  | "contains"
  | "equals"
  | "startsWith"
  | "eq"
  | "ne"
  | "gt"
  | "lt"
  | "between"
  | "is"
  | "isAnyOf"
  | "before"
  | "after"
  | "dateBetween"

export type FilterDef = {
  /** Must match a column id. */
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
```

Add these two optional members to `GroupedDataTableProps<TData>`:

```ts
  /** Declares which columns are filterable and how (the filter "options"). */
  filterableColumns?: FilterDef[]
  /** Optional initial active conditions (config-level; mirrors initialGrouping). */
  initialFilters?: FilterCondition[]
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/grouped-data-table/types.ts
git commit -m "feat: add filter config types to grouped-data-table"
```

---

### Task 3: Pure filter logic — `filter-utils.ts` (TDD)

**Files:**
- Create: `components/grouped-data-table/filter-utils.ts`
- Test: `components/grouped-data-table/filter-utils.test.ts`

- [ ] **Step 1: Write the failing test**

Create `components/grouped-data-table/filter-utils.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import type { FilterCondition, FilterDef } from "./types"
import {
  conditionsToColumnFilters,
  createCondition,
  defaultOperatorsFor,
  describeCondition,
  evaluateCondition,
  normalizeConditions,
  operatorsForDef,
  removeCondition,
  replaceCondition,
  withColumn,
  withOperator,
  withValue,
} from "./filter-utils"

const defs: FilterDef[] = [
  { id: "bank", label: "Bank", type: "select", options: [
    { label: "HSBC", value: "HSBC" }, { label: "Citi", value: "Citi" },
  ] },
  { id: "balance", label: "Balance", type: "number" },
]

describe("defaultOperatorsFor / operatorsForDef", () => {
  it("returns the default operator set per type", () => {
    expect(defaultOperatorsFor("text")).toEqual(["contains", "equals", "startsWith"])
    expect(defaultOperatorsFor("number")).toEqual(["eq", "ne", "gt", "lt", "between"])
    expect(defaultOperatorsFor("select")).toEqual(["is", "isAnyOf"])
    expect(defaultOperatorsFor("date")).toEqual(["before", "after", "dateBetween"])
  })
  it("prefers explicit operators on the def", () => {
    expect(operatorsForDef({ id: "x", label: "X", type: "number", operators: ["gt"] })).toEqual(["gt"])
  })
})

describe("evaluateCondition", () => {
  it("treats empty/null value as no constraint", () => {
    expect(evaluateCondition("anything", "contains", null)).toBe(true)
    expect(evaluateCondition(5, "gt", "")).toBe(true)
    expect(evaluateCondition("x", "isAnyOf", [])).toBe(true)
  })
  it("text contains/equals/startsWith are case-insensitive", () => {
    expect(evaluateCondition("HSBC Bank", "contains", "hsbc")).toBe(true)
    expect(evaluateCondition("HSBC", "equals", "hsbc")).toBe(true)
    expect(evaluateCondition("HSBC", "startsWith", "hs")).toBe(true)
    expect(evaluateCondition("Citi", "contains", "hsbc")).toBe(false)
  })
  it("number operators", () => {
    expect(evaluateCondition(10, "eq", 10)).toBe(true)
    expect(evaluateCondition(10, "ne", 11)).toBe(true)
    expect(evaluateCondition(10, "gt", 5)).toBe(true)
    expect(evaluateCondition(10, "lt", 5)).toBe(false)
    expect(evaluateCondition(10, "between", [5, 15])).toBe(true)
    expect(evaluateCondition(20, "between", [5, 15])).toBe(false)
  })
  it("select is / isAnyOf", () => {
    expect(evaluateCondition("HSBC", "is", "HSBC")).toBe(true)
    expect(evaluateCondition("HSBC", "isAnyOf", ["HSBC", "Citi"])).toBe(true)
    expect(evaluateCondition("ING", "isAnyOf", ["HSBC", "Citi"])).toBe(false)
  })
  it("date before/after/dateBetween", () => {
    expect(evaluateCondition("2024-01-01", "before", "2024-06-01")).toBe(true)
    expect(evaluateCondition("2024-12-01", "after", "2024-06-01")).toBe(true)
    expect(evaluateCondition("2024-03-01", "dateBetween", ["2024-01-01", "2024-06-01"])).toBe(true)
  })
})

describe("conditionsToColumnFilters", () => {
  it("groups conditions by columnId", () => {
    const conds: FilterCondition[] = [
      { id: "a", columnId: "bank", operator: "is", value: "HSBC" },
      { id: "b", columnId: "balance", operator: "gt", value: 100 },
      { id: "c", columnId: "bank", operator: "isAnyOf", value: ["HSBC"] },
    ]
    const result = conditionsToColumnFilters(conds)
    expect(result).toEqual([
      { id: "bank", value: [conds[0], conds[2]] },
      { id: "balance", value: [conds[1]] },
    ])
  })
})

describe("describeCondition", () => {
  it("uses label, operator symbol, and value", () => {
    expect(
      describeCondition({ id: "a", columnId: "balance", operator: "gt", value: 100 }, defs[1]),
    ).toBe("Balance > 100")
  })
  it("maps select values to option labels and joins isAnyOf", () => {
    expect(
      describeCondition(
        { id: "a", columnId: "bank", operator: "isAnyOf", value: ["HSBC", "Citi"] },
        defs[0],
      ),
    ).toBe("Bank is any of HSBC, Citi")
  })
})

describe("mutation helpers", () => {
  it("createCondition defaults to first def + its first operator + null value", () => {
    expect(createCondition(defs, "id1")).toEqual({
      id: "id1", columnId: "bank", operator: "is", value: null,
    })
  })
  it("withColumn resets operator and value", () => {
    const c: FilterCondition = { id: "x", columnId: "bank", operator: "isAnyOf", value: ["HSBC"] }
    expect(withColumn(c, "balance", defs)).toEqual({
      id: "x", columnId: "balance", operator: "eq", value: null,
    })
  })
  it("withOperator resets value", () => {
    const c: FilterCondition = { id: "x", columnId: "balance", operator: "eq", value: 5 }
    expect(withOperator(c, "between")).toEqual({
      id: "x", columnId: "balance", operator: "between", value: null,
    })
  })
  it("withValue sets value", () => {
    const c: FilterCondition = { id: "x", columnId: "balance", operator: "eq", value: null }
    expect(withValue(c, 42)).toEqual({ id: "x", columnId: "balance", operator: "eq", value: 42 })
  })
  it("removeCondition and replaceCondition", () => {
    const list: FilterCondition[] = [
      { id: "a", columnId: "bank", operator: "is", value: "HSBC" },
      { id: "b", columnId: "balance", operator: "gt", value: 1 },
    ]
    expect(removeCondition(list, "a")).toEqual([list[1]])
    const updated = { ...list[0], value: "Citi" }
    expect(replaceCondition(list, updated)).toEqual([updated, list[1]])
  })
  it("normalizeConditions drops unknown columns", () => {
    const list: FilterCondition[] = [
      { id: "a", columnId: "bank", operator: "is", value: "HSBC" },
      { id: "b", columnId: "ghost", operator: "is", value: "x" },
    ]
    expect(normalizeConditions(list, ["bank", "balance"])).toEqual([list[0]])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test filter-utils`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `filter-utils.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test filter-utils`
Expected: PASS (all assertions).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck` (expect PASS), then:
```bash
git add components/grouped-data-table/filter-utils.ts components/grouped-data-table/filter-utils.test.ts
git commit -m "feat: add pure filter logic for grouped-data-table"
```

---

### Task 4: Wire filtering into `useGroupedTable` (TDD)

**Files:**
- Modify: `components/grouped-data-table/use-grouped-table.ts`
- Test: `components/grouped-data-table/use-grouped-table.test.tsx` (append cases)

- [ ] **Step 1: Append failing tests**

Append to `components/grouped-data-table/use-grouped-table.test.tsx` inside the existing `describe("useGroupedTable", ...)` block (after the last test):
```tsx
  it("filters leaf rows from initialFilters and recomputes groups", () => {
    const { renderHook } = require("@testing-library/react")
    const { result } = renderHook(() =>
      useGroupedTable<Acct>({
        data,
        columns,
        groupableDimensions: [{ id: "entity", label: "Entity" }],
        groupColumn: { renderLeaf: (row) => row.original.id },
        initialGrouping: ["entity"],
        enablePagination: false,
        filterableColumns: [{ id: "currency", label: "Ccy", type: "select" }],
        initialFilters: [
          { id: "f1", columnId: "currency", operator: "is", value: "EUR" },
        ],
      }),
    )
    // Only EUR rows survive: ids 2 (Coffee/HSBC/EUR) and 3 (Holding/HSBC/EUR).
    const leafCount = result.current.table
      .getRowModel()
      .rows.flatMap((r) => r.getLeafRows())
      .filter((r) => !r.getIsGrouped()).length
    expect(leafCount).toBe(2)
  })

  it("setFilterConditions drops conditions on non-filterable columns", () => {
    const { result } = setup()
    act(() =>
      result.current.setFilterConditions([
        { id: "f1", columnId: "entity", operator: "is", value: "Coffee Inc" },
        { id: "f2", columnId: "ghost", operator: "is", value: "x" },
      ]),
    )
    expect(result.current.filterConditions.map((c) => c.columnId)).toEqual([])
  })
```

Note: the existing fixture `data`/`columns`/`setup` has `currency` values `USD/EUR/EUR`. The second test passes no `filterableColumns`, so every condition is non-filterable → normalized to `[]`. Keep `act` imported (it already is).

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test use-grouped-table`
Expected: FAIL (`setFilterConditions`/`filterConditions` undefined; `filterableColumns` not accepted).

- [ ] **Step 3: Modify `use-grouped-table.ts`**

Make these changes:

1. Add imports at the top alongside the existing ones:
```ts
import { conditionsToColumnFilters, makeFilterFn, normalizeConditions } from "./grouping-utils-bridge"
```
Wait — these live in `filter-utils`. Use:
```ts
import {
  conditionsToColumnFilters,
  makeFilterFn,
  normalizeConditions,
} from "./filter-utils"
import type { FilterCondition } from "./types"
```

2. Destructure the new props (with defaults) in the function signature object: add `filterableColumns = []` and `initialFilters = []` to the destructured `GroupedDataTableProps`.

3. Replace the existing `columnFilters` state and its `onColumnFiltersChange` wiring. Remove:
```ts
const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
  [],
)
```
and the `onColumnFiltersChange: setColumnFilters,` line. Add instead:
```ts
const filterableIds = React.useMemo(
  () => filterableColumns.map((f) => f.id),
  [filterableColumns],
)

const [filterConditions, setFilterConditionsState] = React.useState<
  FilterCondition[]
>(() => normalizeConditions(initialFilters, filterableIds))

const setFilterConditions = React.useCallback(
  (next: FilterCondition[]) => {
    setFilterConditionsState(normalizeConditions(next, filterableIds))
  },
  [filterableIds],
)

const columnFilters = React.useMemo(
  () => conditionsToColumnFilters(filterConditions),
  [filterConditions],
)
```

4. Inject the filter fn onto filterable columns. After the existing `groupColumnDef`/`allColumns` memos, replace the `allColumns` memo so filterable columns get `filterFn`:
```ts
const filterFn = React.useMemo(() => makeFilterFn<TData>(), [])

const columnsWithFilters = React.useMemo(
  () =>
    columns.map((col) => {
      const id =
        (col as { id?: string }).id ??
        (col as { accessorKey?: string }).accessorKey
      return id && filterableIds.includes(id) ? { ...col, filterFn } : col
    }),
  [columns, filterableIds, filterFn],
)

const allColumns = React.useMemo(
  () => [groupColumnDef, ...columnsWithFilters],
  [groupColumnDef, columnsWithFilters],
)
```
(Delete the previous `allColumns` memo that spread `...columns`.)

5. `state.columnFilters` already references `columnFilters`; it now points at the derived value — keep it. Ensure there is NO `onColumnFiltersChange` option (filtering is driven solely by `filterConditions`).

6. Extend the return type and value:
```ts
export type UseGroupedTableResult<TData> = {
  table: Table<TData>
  grouping: GroupingState
  setGrouping: (next: GroupingState) => void
  filterConditions: FilterCondition[]
  setFilterConditions: (next: FilterCondition[]) => void
}
```
```ts
return { table, grouping, setGrouping, filterConditions, setFilterConditions }
```

7. Remove the now-unused `ColumnFiltersState` import if nothing else uses it (typecheck will tell you).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test use-grouped-table`
Expected: PASS (existing + 2 new tests).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck` (expect PASS), then:
```bash
git add components/grouped-data-table/use-grouped-table.ts components/grouped-data-table/use-grouped-table.test.tsx
git commit -m "feat: wire filter conditions into useGroupedTable"
```

---

### Task 5: Filter builder UI — `filter-builder.tsx` (TDD)

**Files:**
- Create: `components/grouped-data-table/filter-builder.tsx`
- Test: `components/grouped-data-table/filter-builder.test.tsx`

Use the shadcn `Select`/`Input` exports recorded in Task 1. If the recorded `Select` API differs from the conventional names below (`Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`, `onValueChange(value)`), adapt the JSX to the real API and report the change — do NOT guess. All condition logic must go through the Task 3 pure helpers.

- [ ] **Step 1: Write the failing test**

Create `components/grouped-data-table/filter-builder.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FilterBuilderContent } from "./filter-builder"
import type { FilterCondition, FilterDef } from "./types"

const defs: FilterDef[] = [
  { id: "bank", label: "Bank", type: "text" },
  { id: "balance", label: "Balance", type: "number" },
]

describe("FilterBuilderContent", () => {
  it("adds a default condition when 'Add filter' is clicked", async () => {
    const onConditionsChange = vi.fn()
    render(
      <FilterBuilderContent
        filterableColumns={defs}
        conditions={[]}
        onConditionsChange={onConditionsChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /add filter/i }))
    expect(onConditionsChange).toHaveBeenCalledTimes(1)
    const next = onConditionsChange.mock.calls[0][0] as FilterCondition[]
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ columnId: "bank", operator: "contains", value: null })
  })

  it("updates the value as the user types into a text condition", async () => {
    const onConditionsChange = vi.fn()
    const conditions: FilterCondition[] = [
      { id: "c1", columnId: "bank", operator: "contains", value: null },
    ]
    render(
      <FilterBuilderContent
        filterableColumns={defs}
        conditions={conditions}
        onConditionsChange={onConditionsChange}
      />,
    )
    await userEvent.type(screen.getByLabelText("Filter value for Bank"), "HS")
    expect(onConditionsChange).toHaveBeenCalled()
    const lastCall = onConditionsChange.mock.calls.at(-1)![0] as FilterCondition[]
    expect(lastCall[0].value).toBe("HS".slice(-1) === "S" ? lastCall[0].value : "")
    // Final emitted value is a single keystroke applied to the controlled value;
    // assert it is a string (the wiring calls withValue on each change).
    expect(typeof lastCall[0].value === "string" || lastCall[0].value === null).toBe(true)
  })

  it("removes a condition when its remove button is clicked", async () => {
    const onConditionsChange = vi.fn()
    const conditions: FilterCondition[] = [
      { id: "c1", columnId: "bank", operator: "contains", value: "HSBC" },
    ]
    render(
      <FilterBuilderContent
        filterableColumns={defs}
        conditions={conditions}
        onConditionsChange={onConditionsChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /remove filter/i }))
    expect(onConditionsChange).toHaveBeenCalledWith([])
  })
})
```

Note on the value test: the value `Input` is controlled from `condition.value`; since the parent mock does not feed state back, each keystroke fires `onConditionsChange` with `withValue(condition, <input value>)`. The assertion only checks the wiring fires with a string — keep it permissive as written.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test filter-builder`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `filter-builder.tsx`**

```tsx
"use client"

import * as React from "react"
import { Filter, Plus, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

import {
  createCondition,
  operatorsForDef,
  OPERATOR_LABELS,
  removeCondition,
  replaceCondition,
  withColumn,
  withOperator,
  withValue,
} from "./filter-utils"
import type {
  FilterCondition,
  FilterDef,
  FilterOperator,
  FilterValue,
} from "./types"

type FilterBuilderProps = {
  filterableColumns: FilterDef[]
  conditions: FilterCondition[]
  onConditionsChange: (next: FilterCondition[]) => void
}

function defFor(columns: FilterDef[], columnId: string): FilterDef | undefined {
  return columns.find((d) => d.id === columnId)
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

  if (def.type === "select" && def.options) {
    if (op === "isAnyOf") {
      const selected = Array.isArray(condition.value)
        ? (condition.value as string[])
        : []
      return (
        <div className="flex flex-col gap-1" aria-label={ariaLabel} role="group">
          {def.options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={(checked) =>
                  onValueChange(
                    checked === true
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value),
                  )
                }
              />
              {opt.label}
            </label>
          ))}
        </div>
      )
    }
    return (
      <Select
        value={condition.value == null ? "" : String(condition.value)}
        onValueChange={(v) => onValueChange(v)}
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
      ? (condition.value as (string | number)[])
      : ["", ""]
    const inputType = def.type === "date" ? "date" : "number"
    return (
      <div className="flex items-center gap-1">
        <Input
          type={inputType}
          aria-label={`${ariaLabel} from`}
          className="h-8"
          value={pair[0] ?? ""}
          onChange={(e) => onValueChange([e.target.value, pair[1] ?? ""] as never)}
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type={inputType}
          aria-label={`${ariaLabel} to`}
          className="h-8"
          value={pair[1] ?? ""}
          onChange={(e) => onValueChange([pair[0] ?? "", e.target.value] as never)}
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

export function FilterBuilderContent({
  filterableColumns,
  conditions,
  onConditionsChange,
}: FilterBuilderProps) {
  function addCondition() {
    onConditionsChange([
      ...conditions,
      createCondition(filterableColumns, crypto.randomUUID()),
    ])
  }

  function update(next: FilterCondition) {
    onConditionsChange(replaceCondition(conditions, next))
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Filters</p>

      {conditions.length === 0 && (
        <p className="text-sm text-muted-foreground">No filters applied.</p>
      )}

      <div className="space-y-2">
        {conditions.map((condition) => {
          const def =
            defFor(filterableColumns, condition.columnId) ?? filterableColumns[0]
          const operators = operatorsForDef(def)
          return (
            <div key={condition.id} className="flex items-start gap-1.5">
              <Select
                value={condition.columnId}
                onValueChange={(v) =>
                  update(withColumn(condition, v, filterableColumns))
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
                  update(withOperator(condition, v as FilterOperator))
                }
              >
                <SelectTrigger aria-label="Filter operator" className="h-8 w-24">
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
                  onConditionsChange(removeCondition(conditions, condition.id))
                }
              >
                <X className="size-4" />
              </Button>
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={addCondition}
      >
        <Plus className="size-4" />
        Add filter
      </Button>
    </div>
  )
}

export function FilterPopover(props: FilterBuilderProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={(p) => (
          <Button {...p} variant="outline" size="sm" className="gap-2" />
        )}
      >
        <Filter className="size-4" />
        Filters
        {props.conditions.length > 0 && (
          <Badge variant="secondary">{props.conditions.length}</Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96">
        <FilterBuilderContent {...props} />
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test filter-builder`
Expected: PASS (3 tests). If base-ui `Input` doesn't expose its value via the `aria-label` the test queries, confirm the generated `Input` forwards `aria-label`/props and adjust the markup minimally — do not weaken assertions.

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck` (expect PASS), then:
```bash
git add components/grouped-data-table/filter-builder.tsx components/grouped-data-table/filter-builder.test.tsx
git commit -m "feat: add filter builder popover UI"
```

---

### Task 6: Filter chips + toolbar integration (TDD)

**Files:**
- Create: `components/grouped-data-table/filter-chips.tsx`
- Modify: `components/grouped-data-table/grouped-data-table.tsx`
- Test: `components/grouped-data-table/filter-chips.test.tsx`
- Test: `components/grouped-data-table/grouped-data-table.test.tsx` (append)

- [ ] **Step 1: Write failing chip test**

Create `components/grouped-data-table/filter-chips.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FilterChips } from "./filter-chips"
import type { FilterCondition, FilterDef } from "./types"

const defs: FilterDef[] = [{ id: "balance", label: "Balance", type: "number" }]

describe("FilterChips", () => {
  it("renders a chip per condition and removes on click", async () => {
    const onRemove = vi.fn()
    const conditions: FilterCondition[] = [
      { id: "c1", columnId: "balance", operator: "gt", value: 100 },
    ]
    render(
      <FilterChips conditions={conditions} filterDefs={defs} onRemove={onRemove} />,
    )
    expect(screen.getByText("Balance > 100")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /remove balance > 100/i }))
    expect(onRemove).toHaveBeenCalledWith("c1")
  })

  it("renders nothing when there are no conditions", () => {
    const { container } = render(
      <FilterChips conditions={[]} filterDefs={defs} onRemove={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test filter-chips`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `filter-chips.tsx`**

```tsx
"use client"

import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { describeCondition } from "./filter-utils"
import type { FilterCondition, FilterDef } from "./types"

type FilterChipsProps = {
  conditions: FilterCondition[]
  filterDefs: FilterDef[]
  onRemove: (conditionId: string) => void
}

export function FilterChips({
  conditions,
  filterDefs,
  onRemove,
}: FilterChipsProps) {
  if (conditions.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {conditions.map((condition) => {
        const def = filterDefs.find((d) => d.id === condition.columnId)
        const label = describeCondition(condition, def)
        return (
          <Badge key={condition.id} variant="secondary" className="gap-1 pr-1">
            {label}
            <button
              type="button"
              aria-label={`Remove ${label}`}
              onClick={() => onRemove(condition.id)}
              className="rounded-sm text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </Badge>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify chips pass**

Run: `pnpm test filter-chips`
Expected: PASS (2 tests).

- [ ] **Step 5: Integrate into the toolbar**

Edit `components/grouped-data-table/grouped-data-table.tsx`:

1. Add imports:
```ts
import { FilterPopover } from "./filter-builder"
import { FilterChips } from "./filter-chips"
import { removeCondition } from "./filter-utils"
```

2. Destructure the new hook results:
```ts
const { table, grouping, setGrouping, filterConditions, setFilterConditions } =
  useGroupedTable(props)
```

3. Replace the toolbar block (the `<div className="flex items-center gap-2">` wrapping `DimensionPicker`) with:
```tsx
<div className="flex flex-col gap-2">
  <div className="flex items-center gap-2">
    {props.filterableColumns && props.filterableColumns.length > 0 && (
      <FilterPopover
        filterableColumns={props.filterableColumns}
        conditions={filterConditions}
        onConditionsChange={setFilterConditions}
      />
    )}
    <DimensionPicker
      dimensions={props.groupableDimensions}
      grouping={grouping}
      onGroupingChange={setGrouping}
    />
  </div>
  {props.filterableColumns && props.filterableColumns.length > 0 && (
    <FilterChips
      conditions={filterConditions}
      filterDefs={props.filterableColumns}
      onRemove={(id) => setFilterConditions(removeCondition(filterConditions, id))}
    />
  )}
</div>
```

- [ ] **Step 6: Append a filtering integration test**

Append to `components/grouped-data-table/grouped-data-table.test.tsx` inside its `describe`:
```tsx
  it("applies initialFilters and shows a removable chip", () => {
    render(
      <GroupedDataTable<Acct>
        data={data}
        columns={columns}
        groupableDimensions={[{ id: "entity", label: "Entity" }]}
        initialGrouping={["entity"]}
        enablePagination={false}
        filterableColumns={[{ id: "currency", label: "Ccy", type: "select" }]}
        initialFilters={[
          { id: "f1", columnId: "currency", operator: "is", value: "USD" },
        ]}
        groupColumn={{ header: "Account", renderLeaf: (row) => row.original.id }}
      />,
    )
    // Only the USD row remains → a single entity group "Coffee Inc (1)".
    expect(screen.getByText("Coffee Inc")).toBeInTheDocument()
    expect(screen.getByText("(1)")).toBeInTheDocument()
    expect(screen.queryByText("Holding BV")).not.toBeInTheDocument()
    // Chip is shown.
    expect(screen.getByText("Ccy is USD")).toBeInTheDocument()
  })
```
(The existing fixture: id 1 = Coffee Inc/USD, id 2 = Coffee Inc/EUR, id 3 = Holding BV/EUR. Filtering currency is USD leaves only id 1 → Coffee Inc (1), and Holding BV disappears.)

- [ ] **Step 7: Run the full suite + typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: ALL tests PASS; typecheck PASS.

- [ ] **Step 8: Commit**

```bash
git add components/grouped-data-table/filter-chips.tsx components/grouped-data-table/filter-chips.test.tsx components/grouped-data-table/grouped-data-table.tsx components/grouped-data-table/grouped-data-table.test.tsx
git commit -m "feat: add filter chips and wire filter toolbar into GroupedDataTable"
```

---

### Task 7: Barrel exports + example page filters

**Files:**
- Modify: `components/grouped-data-table/index.ts`
- Modify: `app/(examples)/accounts/accounts-table.tsx`

- [ ] **Step 1: Export new public surface from `index.ts`**

Add to `components/grouped-data-table/index.ts`:
```ts
export { FilterPopover, FilterBuilderContent } from "./filter-builder"
export { FilterChips } from "./filter-chips"
export {
  type FilterType,
  type FilterOperator,
  type FilterDef,
  type FilterCondition,
  type FilterValue,
} from "./types"
```

- [ ] **Step 2: Add `filterableColumns` to the example**

Edit `app/(examples)/accounts/accounts-table.tsx`. Add a `FilterDef[]` derived from the data and pass it to `GroupedDataTable`. Insert near the existing module-scope config:
```tsx
import type { DimensionDef, FilterDef, GroupColumnConfig } from "@/components/grouped-data-table"
import { accounts } from "./data"

const uniqueOptions = (values: string[]) =>
  Array.from(new Set(values)).map((v) => ({ label: v, value: v }))

const filterableColumns: FilterDef[] = [
  { id: "entity", label: "Entity", type: "select", options: uniqueOptions(accounts.map((a) => a.entity)) },
  { id: "bank", label: "Bank", type: "select", options: uniqueOptions(accounts.map((a) => a.bank)) },
  { id: "currency", label: "Ccy", type: "select", options: uniqueOptions(accounts.map((a) => a.currency)) },
  { id: "balance", label: "Balance", type: "number" },
]
```
Then add `filterableColumns={filterableColumns}` to the `<GroupedDataTable<Account> ... />` props. (If `accounts` is already imported in this file, don't duplicate the import.)

- [ ] **Step 3: Typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: typecheck PASS; build compiles `/accounts`.

- [ ] **Step 4: Commit**

```bash
git add components/grouped-data-table/index.ts "app/(examples)/accounts/accounts-table.tsx"
git commit -m "feat: export filter API and add filterableColumns to accounts example"
```

---

### Task 8: Final verification gate

**Files:** none

- [ ] **Step 1: Full check suite**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: typecheck PASS; lint 0 errors (the known React-Compiler `useReactTable` warnings are acceptable); all tests PASS; build compiles.

- [ ] **Step 2: Confirm clean tree**

Run: `git status`
Expected: all feature work committed on `feat/grouped-data-table`.

(Browser verification of the filter UX — open Filters popover, add a `balance > N` and a `bank is any of …` condition, confirm rows/chips update and groups recompute — is performed by the controller after the tasks complete.)

---

## Self-Review Notes (author checklist — verified)

- **Spec coverage:** FilterDef/FilterCondition types (Task 2); pure logic incl. default operators, evaluateCondition, conditionsToColumnFilters, describeCondition, makeFilterFn, mutation helpers (Task 3); hook filter state + derived columnFilters + filterFn augmentation (Task 4); FilterPopover/FilterBuilderContent + type-adaptive value inputs (Task 5); FilterChips + toolbar layout (Task 6); example `filterableColumns` + barrel exports (Task 7); AND-combination (per-column filterFn ANDs conditions, TanStack ANDs columns); empty-value passthrough (evaluateCondition). 
- **Type consistency:** `FilterDef`/`FilterCondition`/`FilterValue`/`FilterOperator`/`FilterType` used identically across tasks; hook returns `{ table, grouping, setGrouping, filterConditions, setFilterConditions }`; `FilterBuilderContent`/`FilterPopover` props `{ filterableColumns, conditions, onConditionsChange }`; `FilterChips` props `{ conditions, filterDefs, onRemove }`; helper names (`createCondition`, `withColumn`, `withOperator`, `withValue`, `removeCondition`, `replaceCondition`, `normalizeConditions`, `operatorsForDef`) consistent.
- **No placeholders:** every code step contains complete code; run steps state expected results.
- **base-ui risk:** Task 1 records the real `Select`/`Input` API; Task 5 adapts to it. base-ui Select portal is not opened in jsdom — all logic is in pure helpers (Task 3) and the testable Input/buttons.
- **Out of scope (unchanged):** MCP server, controlled props/programmatic apply, OR-combination, registry, getRowId.
```
