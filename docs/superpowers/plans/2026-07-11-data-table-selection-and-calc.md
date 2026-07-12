# data-table-selection-and-calc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add row selection (row-number gutter, hover-to-checkbox, tri-state select-all) and footer calc (per-column aggregation with hybrid client/server support) to the already-shipped `@kotsas-ui/data-table`. This is Plan 3 of the DataTable architecture spec's remaining scope (Plan 1 = `table-fields`, Plan 2 = `data-table` core grid, both shipped; Plan 4 = undo/redo + copy/paste/export, later).

**Architecture:** A leading gutter column, built independently of `defineColumns` (it has no `TData` accessor — it's structural, not a data column), is prepended to the user's columns by `useDataTable` when `enableRowSelection` is on. Row selection itself rides TanStack Table's native `rowSelection` state and `getIsAllRowsSelected`/`getIsAllPageRowsSelected`/`getSelectedRowModel` APIs directly — no custom selection state is needed except a single extra `isAllMatchingSelected` flag (exposed via `DataTableRuntime`) for the one case TanStack's own state literally cannot express: "every row matching the filter, including rows not yet loaded from the server." Footer calc is a sibling hook, `useFooterAggregation`, composing a pure `aggregate(method, values)` utility for the client-side path and a small state machine (idle → loading → value → stale/error) for the `computeAggregate` server path — the same shape the spec earmarks for reuse by future async cell types.

**Tech Stack:** React 18+, TypeScript strict, `@tanstack/react-table@8.21.3`, existing `@kotsas-ui/data-table` (this plan extends it in place, not a new registry tier), shadcn primitives (`Checkbox`, `Popover`, `Table`), `lucide-react`, Vitest + Testing Library + jsdom, shadcn registry (base-ui + Radix builds).

## Scope decisions for this plan (read before implementing)

1. **One flag gates the whole gutter.** `enableRowSelection` (default `false`) turns on row numbers, hover-to-checkbox, and the tri-state select-all together — not split into finer-grained flags. A consumer who wants row numbers without selection, or vice versa, is out of scope for R1.
2. **The tri-state select-all's third step ("all-matching, including unloaded rows") only appears when it's meaningful.** It's offered only when `manualPagination` is `true` and `totalRowCount` exceeds the loaded row count. Otherwise the control cycles through exactly the states TanStack's own `getIsAllPageRowsSelected()`/`getIsAllRowsSelected()` already express (none → page → all-loaded), with no extra state needed — verified against `@tanstack/table-core`'s `RowSelection.ts` feature source before writing this plan (`getIsAllRowsSelected` operates over `getFilteredRowModel().flatRows` — every row matching the current filter across all pages, not just the current page — so "all-loaded" already means "everything the client has," and the extra flag is needed only for rows the client doesn't have at all).
3. **`calculableColumns` is a plain runtime array**, not threaded through `defineColumns`'s compile-time typing — matches the spec's own description (`{ columnId, methods?, default? }[]`) and keeps `defineColumns` completely unchanged. It's a `DataTable`-level prop, a sibling to `columns`, not a per-column builder option.
4. **No new base-ui/Radix primitive shim.** The select-all checkbox's indeterminate visual and the footer's method-picker popover are both built from already-abstracted shared primitives (`Checkbox`, `Popover`/`PopoverContent`) plus plain elements and **call-site Tailwind arbitrary-attribute selectors** — not by modifying `components/ui/checkbox.tsx` or adding a `group` marker class to a shared component. This sidesteps the exact registry-distribution trap Plan 2 hit and fixed: `checkbox`/`table` are plain `registryDependencies` resolved from the *consumer's own* registry config, so any hand-edit to this repo's local copy of a shared `components/ui/*` file never reaches a fresh `npx shadcn add` install.
5. **`TableFooter` is a new, purely additive export on the shared `components/ui/table.tsx`**, mirroring the existing `TableHeader`/`TableBody` pattern. Before writing Task 6, the implementer must check whether the *stock* shadcn `table.tsx` (the one a consumer's `checkbox`/`table` registryDependency actually resolves to) already ships a `TableFooter` — if so, this addition just catches this repo's local copy up to parity rather than diverging from it; if not, it's a safe, backward-compatible addition (existing consumers who never import `TableFooter` see no change).
6. **Footer staleness tracks method + scope only, not underlying data changes.** A prior server-computed value goes `stale` when the user changes the aggregation method or the selection scope; it does *not* automatically detect that `data` itself changed underneath it. Re-fetching on every data change would require this hook to diff `data` on every render — out of scope for R1, and the existing "stale" affordance still lets a user manually refresh.
7. **Row selection is stored in `useDataTable`'s own React state**, uncontrolled (no `onRowSelectionChange`-to-consumer escape hatch in this plan) — matching how `sorting`/`columnVisibility`/etc. already work in this file. A future plan can add a controlled variant if a real consumer needs it.

## File Structure

**Modify:**
- `components/ui/table.tsx` — add `TableFooter`.
- `components/data-table/types.ts` — add `AggregationMethod`, `CalculableColumn`, `ComputeAggregateArgs`, `AggregateCellState`; extend `DataTableRuntime` with `isAllMatchingSelected`, `setAllMatchingSelected`, `manualPagination`, `totalRowCount`.
- `components/data-table/types.test.ts`, `components/data-table/data-table-runtime-context.test.tsx`, `components/data-table/define-columns.test.tsx` — each constructs a full `DataTableRuntime` object literal; all three need the four new required fields added (Task 1), or `pnpm typecheck` breaks immediately.
- `components/data-table/use-data-table.ts` — wire TanStack `rowSelection` state, `enableRowSelection`/`manualPagination`/`totalRowCount` options, gutter column injection, `isAllMatchingSelected` state; compose `useFooterAggregation`.
- `components/data-table/data-table.tsx` — thread new `DataTableProps`, render `DataTableFooter` when calculable columns are configured.
- `components/data-table/index.ts` — export new public symbols.
- `registry.json` — add new files to the `data-table` and `data-table-radix` items' `files` arrays.
- `app/(examples)/data-table-demo/columns.tsx`, `app/(examples)/data-table-demo/data-table-client.tsx` — extend the existing demo with selection + a calculable column, for manual browser verification.

**Create, under `components/data-table/`:**
- `aggregate.ts` — pure `aggregate(method, values)` + method labels/list.
- `aggregate.test.ts`
- `row-gutter.tsx` — `ROW_GUTTER_COLUMN_ID`, `buildRowGutterColumn<TData>()`.
- `row-gutter.test.tsx`
- `use-footer-aggregation.ts` — the `useFooterAggregation` hook.
- `use-footer-aggregation.test.ts`
- `footer-aggregation.tsx` — `DataTableFooter` + the method-picker popover.
- `footer-aggregation.test.tsx`

**Conventions (unchanged from Plans 1-2):** `pnpm exec vitest run <path>`, `pnpm typecheck`, `pnpm exec eslint <path>`, `pnpm registry:build`. Work on a feature branch.

---

## Task 0: Branch

- [ ] **Step 1: Create the feature branch**

```bash
cd /Users/gianniskotsas/Documents/WebDev/react-pivot-table
git checkout main && git pull --ff-only origin main
git checkout -b feat/data-table-selection-and-calc
```

---

## Task 1: Core types + `aggregate()`

**Files:**
- Modify: `components/data-table/types.ts`
- Create: `components/data-table/aggregate.ts`
- Test: `components/data-table/aggregate.test.ts`

**Interfaces:**
- Produces: `AggregationMethod`, `CalculableColumn`, `ComputeAggregateArgs`, `AggregateCellState` (all in `types.ts`); `aggregate(method, values)`, `AGGREGATION_METHOD_LABELS`, `ALL_AGGREGATION_METHODS` (in `aggregate.ts`). Every later task in this plan imports from these two files.

- [ ] **Step 1: Add the new types to `types.ts`**

Append to `components/data-table/types.ts` (after the existing `DataTableColumnMeta` type, before `DataTableRuntime`):

```ts
/** Supported footer/selection-summary aggregation methods. */
export type AggregationMethod = "sum" | "avg" | "min" | "max" | "count"

/** Dev-declared: which columns support footer aggregation and which methods. */
export type CalculableColumn = {
  columnId: string
  /** Methods offered in the picker; defaults to all five. */
  methods?: AggregationMethod[]
  /** Initial method shown before the user picks one; defaults to off (null). */
  default?: AggregationMethod | null
}

/** Args passed to the dev-supplied computeAggregate callback for scopes that exceed what's loaded client-side. */
export type ComputeAggregateArgs = {
  columnId: string
  method: AggregationMethod
  scope: "all-matching" | "selection-all-matching"
}

/**
 * Lifecycle of a server-computed aggregate value. `idle` before the user has
 * triggered a calculation; `stale` when a prior server value's inputs
 * (method or scope) have since changed but a fresh value hasn't been
 * requested yet. `partial` on a `value`/`stale` state means the number was
 * computed from loaded rows only (no `computeAggregate` was provided even
 * though the scope exceeds what's loaded) — the UI shows a qualifier rather
 * than silently presenting a wrong-looking total as authoritative.
 */
export type AggregateCellState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "value"; value: number; partial?: boolean }
  | { status: "stale"; value: number; partial?: boolean }
  | { status: "error"; message: string }
```

Then extend `DataTableRuntime` (the existing type) with these fields, added after `handleKeyDown`:

```ts
  /** Whether pagination is server-driven (useDataTable's manualPagination option) — lets cell renderers (row-gutter, footer) tell whether more rows exist beyond what's loaded. */
  manualPagination: boolean
  /** Total row count across all pages when manualPagination is true; undefined for client-side pagination, where loaded rows already are all rows. */
  totalRowCount: number | undefined
  /**
   * True once the user's select-all click cycle has advanced past "every
   * loaded/filtered row" to "every row matching the current filter,
   * including any not yet loaded" — a logical selection, not a
   * materialization of every id. Only meaningful when `totalRowCount`
   * exceeds the loaded row count; otherwise selecting every loaded row
   * already means "everything," and this stays false.
   */
  isAllMatchingSelected: boolean
  /**
   * Sets `isAllMatchingSelected`. Turning it on also selects every
   * currently-loaded row (via the table's own row-selection state) so the
   * visible checkboxes agree with the logical "everything" state; turning
   * it off does NOT automatically deselect loaded rows, since the caller
   * may be narrowing from "all-matching" back to "all loaded" rather than
   * to "none" — the row-gutter's click-cycle (Task 2) owns that distinction
   * and calls the appropriate table method itself when needed.
   */
  setAllMatchingSelected: (matching: boolean) => void
```

- [ ] **Step 2: Write the failing test for `aggregate()`**

Create `components/data-table/aggregate.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { AGGREGATION_METHOD_LABELS, ALL_AGGREGATION_METHODS, aggregate } from "./aggregate"

describe("aggregate", () => {
  it("sums values", () => {
    expect(aggregate("sum", [1, 2, 3])).toBe(6)
  })

  it("averages values", () => {
    expect(aggregate("avg", [2, 4, 6])).toBe(4)
  })

  it("finds min and max", () => {
    expect(aggregate("min", [5, 1, 9])).toBe(1)
    expect(aggregate("max", [5, 1, 9])).toBe(9)
  })

  it("counts values, including blanks", () => {
    expect(aggregate("count", [1, 2, 3])).toBe(3)
    expect(aggregate("count", [1, null, undefined])).toBe(3)
    expect(aggregate("count", [])).toBe(0)
  })

  it("ignores null/undefined/NaN for sum/avg/min/max", () => {
    expect(aggregate("sum", [1, null, 2, undefined, Number.NaN, 3])).toBe(6)
    expect(aggregate("avg", [10, null, 20])).toBe(15)
    expect(aggregate("min", [null, 5, undefined, 2])).toBe(2)
    expect(aggregate("max", [null, 5, undefined, 2])).toBe(5)
  })

  it("returns 0 for sum of an empty/all-blank input, NaN for avg/min/max", () => {
    expect(aggregate("sum", [])).toBe(0)
    expect(aggregate("sum", [null, undefined])).toBe(0)
    expect(aggregate("avg", [])).toBeNaN()
    expect(aggregate("min", [])).toBeNaN()
    expect(aggregate("max", [])).toBeNaN()
  })

  it("exposes labels and an ordered method list for the picker UI", () => {
    expect(AGGREGATION_METHOD_LABELS.sum).toBe("Sum")
    expect(AGGREGATION_METHOD_LABELS.avg).toBe("Average")
    expect(AGGREGATION_METHOD_LABELS.min).toBe("Min")
    expect(AGGREGATION_METHOD_LABELS.max).toBe("Max")
    expect(AGGREGATION_METHOD_LABELS.count).toBe("Count")
    expect(ALL_AGGREGATION_METHODS).toEqual(["sum", "avg", "min", "max", "count"])
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/data-table/aggregate.test.ts`
Expected: FAIL — cannot resolve `./aggregate`.

- [ ] **Step 4: Implement `aggregate.ts`**

Create `components/data-table/aggregate.ts`:

```ts
import type { AggregationMethod } from "./types"

/**
 * Pure aggregation over numeric values, shared by the footer's client-side
 * scope and (by convention — the dev's own `computeAggregate` implementation
 * is expected to mirror this) the server path.
 *
 * `count` counts every value regardless of blankness (matches "row count"
 * semantics); sum/avg/min/max ignore null/undefined/NaN entries so a blank
 * cell doesn't corrupt the result. An all-blank/empty input returns 0 for
 * sum (the additive identity) and NaN for avg/min/max, since there's no
 * meaningful average/min/max of nothing — callers format NaN as an em dash
 * rather than the literal string "NaN".
 */
export function aggregate(
  method: AggregationMethod,
  values: (number | null | undefined)[],
): number {
  if (method === "count") return values.length

  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v))
  switch (method) {
    case "sum":
      return nums.reduce((a, b) => a + b, 0)
    case "avg":
      return nums.length === 0 ? Number.NaN : nums.reduce((a, b) => a + b, 0) / nums.length
    case "min":
      return nums.length === 0 ? Number.NaN : Math.min(...nums)
    case "max":
      return nums.length === 0 ? Number.NaN : Math.max(...nums)
  }
}

/** Human-readable labels for the method picker UI. */
export const AGGREGATION_METHOD_LABELS: Record<AggregationMethod, string> = {
  sum: "Sum",
  avg: "Average",
  min: "Min",
  max: "Max",
  count: "Count",
}

/** Ordered list of all methods, for the picker's option list. */
export const ALL_AGGREGATION_METHODS: AggregationMethod[] = ["sum", "avg", "min", "max", "count"]
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/data-table/aggregate.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Fix the three pre-existing files that construct a full `DataTableRuntime` object literal**

Adding required fields to `DataTableRuntime` breaks type-checking for any file that builds a complete literal of that type (a `Partial<DataTableRuntime>` overrides param doesn't help — the *base* object being overridden must still satisfy every required field). Three files do this; fix all three now so the build never sits broken mid-plan:

In `components/data-table/types.test.ts`, add the four new fields to the existing `runtime: DataTableRuntime = { ... }` literal (after `handleKeyDown: () => {},`):

```ts
      manualPagination: false,
      totalRowCount: undefined,
      isAllMatchingSelected: false,
      setAllMatchingSelected: () => {},
```

In `components/data-table/data-table-runtime-context.test.tsx`, add the same four fields to the existing `STUB_RUNTIME: DataTableRuntime = { ... }` literal (after `handleKeyDown: () => {},`):

```ts
  manualPagination: false,
  totalRowCount: undefined,
  isAllMatchingSelected: false,
  setAllMatchingSelected: () => {},
```

In `components/data-table/define-columns.test.tsx`, add the same four fields to the existing `stubRuntime()` helper's base object literal (after `handleKeyDown: vi.fn(),`, before the `...overrides` spread):

```ts
    manualPagination: false,
    totalRowCount: undefined,
    isAllMatchingSelected: false,
    setAllMatchingSelected: vi.fn(),
```

- [ ] **Step 7: Run the full data-table suite to confirm nothing broke**

Run: `pnpm exec vitest run components/data-table/`
Expected: 100% pass (all pre-existing tests, including the three files just touched).

- [ ] **Step 8: Typecheck + lint + commit**

Run: `pnpm typecheck` (this also validates the `types.ts` additions compile — including the three fixed-up literals), `pnpm exec eslint components/data-table/aggregate.ts components/data-table/aggregate.test.ts components/data-table/types.ts components/data-table/types.test.ts components/data-table/data-table-runtime-context.test.tsx components/data-table/define-columns.test.tsx`.

```bash
git add components/data-table/types.ts components/data-table/types.test.ts components/data-table/data-table-runtime-context.test.tsx components/data-table/define-columns.test.tsx components/data-table/aggregate.ts components/data-table/aggregate.test.ts
git commit -m "feat(data-table): add core selection/aggregation types + pure aggregate()

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

**Deviation, found by the implementer:** this plan's own file list missed a 4th file that constructs a full `DataTableRuntime` literal — `components/data-table/use-data-table.ts` itself (the production runtime hook, `runtime: DataTableRuntime = { ...nav, isColumnEditable, updateData }`). Fixed with the same 4 stub defaults (`manualPagination: false`, `totalRowCount: undefined`, `isAllMatchingSelected: false`, `setAllMatchingSelected: () => {}`), documented as temporary pending Task 3's real wiring. Independently spec-verified sound (no behavior change for existing consumers, since nothing reads these fields yet). Quality review found one cheap fix (a comment misattributed the real-wiring task number), applied and amended in. Full repo suite: 194/194 passing. Final commit `1259011`.

---

## Task 2: Row-number gutter + tri-state select-all

**Files:**
- Create: `components/data-table/row-gutter.tsx`
- Test: `components/data-table/row-gutter.test.tsx`

**Interfaces:**
- Consumes: `DataTableRuntime.isAllMatchingSelected` / `.setAllMatchingSelected` / `.manualPagination` / `.totalRowCount` (Task 1); `useDataTableRuntime()` (already shipped, `components/data-table/data-table-runtime-context.ts`).
- Produces: `ROW_GUTTER_COLUMN_ID: string`, `buildRowGutterColumn<TData>(): ColumnDef<TData, unknown>`. Task 3 imports both to prepend the gutter column and to exclude it from keyboard-navigable column ids.

This column is built independently of `defineColumns` — it has no `TData` accessor, so it doesn't go through `buildColumn`/`makeFieldCell` at all. Its `header`/`cell` are plain TanStack render functions using `ctx.table`/`ctx.row` directly.

- [ ] **Step 1: Write the failing test**

Create `components/data-table/row-gutter.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { flexRender } from "@tanstack/react-table"
import { describe, expect, it, vi } from "vitest"

import { DataTableRuntimeContext } from "./data-table-runtime-context"
import { ROW_GUTTER_COLUMN_ID, buildRowGutterColumn } from "./row-gutter"
import type { DataTableRuntime } from "./types"

function stubRuntime(overrides: Partial<DataTableRuntime> = {}): DataTableRuntime {
  return {
    activeCell: null,
    editingCell: null,
    isActive: () => false,
    isEditing: () => false,
    setActiveCell: vi.fn(),
    beginEdit: vi.fn(),
    stopEditing: vi.fn(),
    moveActive: vi.fn(),
    isColumnEditable: () => false,
    updateData: vi.fn(),
    handleKeyDown: vi.fn(),
    manualPagination: false,
    totalRowCount: undefined,
    isAllMatchingSelected: false,
    setAllMatchingSelected: vi.fn(),
    ...overrides,
  }
}

function mockTable({
  allPageSelected = false,
  allRowsSelected = false,
  somePageSelected = false,
  someRowsSelected = false,
  filteredCount = 3,
} = {}) {
  return {
    getIsAllPageRowsSelected: () => allPageSelected,
    getIsAllRowsSelected: () => allRowsSelected,
    getIsSomePageRowsSelected: () => somePageSelected,
    getIsSomeRowsSelected: () => someRowsSelected,
    toggleAllRowsSelected: vi.fn(),
    toggleAllPageRowsSelected: vi.fn(),
    getFilteredRowModel: () => ({ flatRows: Array.from({ length: filteredCount }) }),
    getState: () => ({ pagination: { pageIndex: 0, pageSize: 10 } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

function mockRow({ index = 0, selected = false } = {}) {
  return {
    index,
    getIsSelected: () => selected,
    toggleSelected: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe("buildRowGutterColumn", () => {
  it("has the expected id and structural column flags", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    expect(column.id).toBe(ROW_GUTTER_COLUMN_ID)
    expect(column.enableSorting).toBe(false)
    expect(column.enableHiding).toBe(false)
    expect(column.enablePinning).toBe(false)
    expect(column.enableResizing).toBe(false)
  })

  it("body cell shows the row number by default, and a checkbox on hover", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const table = mockTable()
    const row = mockRow({ index: 2 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table, row, column } as any

    render(<>{flexRender(column.cell, ctx)}</>)
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.queryByRole("checkbox")).toBeNull()

    fireEvent.mouseEnter(screen.getByText("3").parentElement!)
    expect(screen.getByRole("checkbox")).toBeInTheDocument()
  })

  it("body cell shows a checkbox (not the number) when the row is already selected", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const table = mockTable()
    const row = mockRow({ index: 0, selected: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table, row, column } as any

    render(<>{flexRender(column.cell, ctx)}</>)
    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toBeInTheDocument()
    fireEvent.click(checkbox)
    expect(row.toggleSelected).toHaveBeenCalledWith(false)
  })

  it("header click cycles none -> page -> all-loaded when there's nothing beyond what's loaded", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const table = mockTable({ filteredCount: 3 })
    const runtime = stubRuntime()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table } as any

    const { rerender } = render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.header, ctx)}
      </DataTableRuntimeContext.Provider>,
    )
    fireEvent.click(screen.getByRole("checkbox"))
    expect(table.toggleAllPageRowsSelected).toHaveBeenCalledWith(true)

    // Simulate the table reporting the page is now fully selected.
    const tableAfterPage = mockTable({ allPageSelected: true, somePageSelected: true, someRowsSelected: true })
    rerender(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.header, { table: tableAfterPage } as never)}
      </DataTableRuntimeContext.Provider>,
    )
    fireEvent.click(screen.getByRole("checkbox"))
    expect(tableAfterPage.toggleAllRowsSelected).toHaveBeenCalledWith(true)
  })

  it("header click advances to all-matching when more rows exist beyond what's loaded, then clears", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const table = mockTable({ allRowsSelected: true, allPageSelected: true, someRowsSelected: true, filteredCount: 3 })
    const setAllMatchingSelected = vi.fn()
    const runtime = stubRuntime({
      manualPagination: true,
      totalRowCount: 100,
      setAllMatchingSelected,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table } as any

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.header, ctx)}
      </DataTableRuntimeContext.Provider>,
    )
    fireEvent.click(screen.getByRole("checkbox"))
    expect(setAllMatchingSelected).toHaveBeenCalledWith(true)
  })

  it("header click clears everything from the all-matching state", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const table = mockTable({ allRowsSelected: true })
    const setAllMatchingSelected = vi.fn()
    const runtime = stubRuntime({
      manualPagination: true,
      totalRowCount: 100,
      isAllMatchingSelected: true,
      setAllMatchingSelected,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table } as any

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.header, ctx)}
      </DataTableRuntimeContext.Provider>,
    )
    fireEvent.click(screen.getByRole("checkbox"))
    expect(setAllMatchingSelected).toHaveBeenCalledWith(false)
    expect(table.toggleAllRowsSelected).toHaveBeenCalledWith(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/data-table/row-gutter.test.tsx`
Expected: FAIL — cannot resolve `./row-gutter`.

- [ ] **Step 3: Implement `row-gutter.tsx`**

Create `components/data-table/row-gutter.tsx`:

```tsx
"use client"

import type { CellContext, ColumnDef, HeaderContext } from "@tanstack/react-table"
import { Minus } from "lucide-react"
import * as React from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

import { useDataTableRuntime } from "./data-table-runtime-context"

/** Stable id for the injected leading gutter column (row numbers + selection). */
export const ROW_GUTTER_COLUMN_ID = "__row-gutter__"

function SelectAllHeader<TData>({ table }: HeaderContext<TData, unknown>) {
  const runtime = useDataTableRuntime()
  const isAllMatchingSelected = runtime?.isAllMatchingSelected ?? false
  const hasMoreThanLoaded =
    (runtime?.manualPagination ?? false) &&
    (runtime?.totalRowCount ?? 0) > table.getFilteredRowModel().flatRows.length

  const allPageSelected = table.getIsAllPageRowsSelected()
  const allLoadedSelected = table.getIsAllRowsSelected()
  const someSelected = table.getIsSomeRowsSelected() || table.getIsSomePageRowsSelected()

  const checked = isAllMatchingSelected || allLoadedSelected
  const indeterminate = !checked && someSelected

  function handleClick() {
    if (isAllMatchingSelected) {
      runtime?.setAllMatchingSelected(false)
      table.toggleAllRowsSelected(false)
      return
    }
    if (allLoadedSelected) {
      if (hasMoreThanLoaded) runtime?.setAllMatchingSelected(true)
      else table.toggleAllRowsSelected(false)
      return
    }
    if (allPageSelected) {
      table.toggleAllRowsSelected(true)
      return
    }
    table.toggleAllPageRowsSelected(true)
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <Checkbox
        checked={checked}
        onCheckedChange={handleClick}
        aria-label={checked ? "Deselect all rows" : "Select all rows"}
        className={indeterminate ? "[&_svg]:opacity-0" : undefined}
      />
      {indeterminate ? (
        <Minus className="pointer-events-none absolute size-3" aria-hidden="true" />
      ) : null}
    </div>
  )
}

function RowGutterCell<TData>({ row, table }: CellContext<TData, unknown>) {
  const [hovered, setHovered] = React.useState(false)
  const selected = row.getIsSelected()
  const pagination = table.getState().pagination
  const pageIndex = pagination?.pageIndex ?? 0
  const pageSize = pagination?.pageSize ?? table.getRowModel().rows.length
  const rowNumber = pageIndex * pageSize + row.index + 1

  return (
    <div
      className="flex h-full items-center justify-center px-2 py-1 text-xs text-muted-foreground"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {selected || hovered ? (
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => row.toggleSelected(checked === true)}
          aria-label={selected ? `Deselect row ${rowNumber}` : `Select row ${rowNumber}`}
        />
      ) : (
        <span className={cn("tabular-nums")}>{rowNumber}</span>
      )}
    </div>
  )
}

/**
 * Builds the leading gutter column: row numbers that swap to a selection
 * checkbox on hover (or when the row is selected), plus a tri-state
 * select-all checkbox in the header. Prepended to the user's columns by
 * useDataTable (Task 3) when `enableRowSelection` is true — not part of the
 * `defineColumns` builder, since it's a structural, table-owned column with
 * no TData accessor.
 */
export function buildRowGutterColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: ROW_GUTTER_COLUMN_ID,
    header: SelectAllHeader,
    cell: RowGutterCell,
    enableSorting: false,
    enableHiding: false,
    enablePinning: false,
    enableResizing: false,
    size: 40,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/data-table/row-gutter.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/data-table/row-gutter.tsx components/data-table/row-gutter.test.tsx`, then `pnpm typecheck`.

```bash
git add components/data-table/row-gutter.tsx components/data-table/row-gutter.test.tsx
git commit -m "feat(data-table): add row-number gutter + tri-state select-all column

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Independently spec-verified with zero deviations (byte-for-byte match to this plan's given code). Quality review found 4 real issues, all fixed: (1) `indeterminate` was computed but never passed to `<Checkbox>`, so `aria-checked` stayed `"false"` during partial selection instead of `"mixed"`, and the `[&_svg]:opacity-0` CSS hack was dead code (base-ui's Indicator never mounts without `checked || indeterminate`) — fixed by passing `indeterminate={indeterminate}`; (2) the per-row checkbox was unreachable by keyboard for any unselected row (hover-only reveal, no `tabIndex`/focus handling) — fixed with `tabIndex={0}` + `onFocus`/`onBlur` mirroring the mouse handlers; (3) the header's `aria-label` didn't distinguish partial/all-loaded/all-matching states — fixed with a state-aware label matching `column-header.tsx`'s established pattern; (4) the pagination-disabled fallback (`?? table.getRowModel().rows.length`) was dead code resting on an incorrect assumption (TanStack's `pagination` state is never actually `undefined`) — simplified and documented. A 7th test was added for the `aria-checked="mixed"` state. Full regression: 120/120. Amended into the original commit — final SHA `dd89bf4`.

---

## Task 3: Wire row selection into `useDataTable` / `DataTable`

**Files:**
- Modify: `components/data-table/use-data-table.ts`
- Modify: `components/data-table/use-data-table.test.tsx`
- Modify: `components/data-table/data-table.tsx`
- Modify: `components/data-table/data-table.test.tsx`

**Interfaces:**
- Consumes: `buildRowGutterColumn`, `ROW_GUTTER_COLUMN_ID` (Task 2).
- Produces: `UseDataTableOptions.enableRowSelection?: boolean`, `.manualPagination?: boolean`, `.totalRowCount?: number`; `DataTableProps` gains the same three, threaded through to `useDataTable`. `runtime.manualPagination`/`.totalRowCount`/`.isAllMatchingSelected`/`.setAllMatchingSelected` are now live (Task 1 declared the types; this task provides real values).

- [ ] **Step 1: Write the failing tests**

Add to `components/data-table/use-data-table.test.tsx` (new `describe` block; keep all existing tests):

```tsx
describe("useDataTable — row selection", () => {
  it("enableRowSelection prepends the gutter column and it's excluded from keyboard-navigable columns", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name")],
        getRowId: (row) => row.id,
        enableRowSelection: true,
      }),
    )
    expect(result.current.table.getAllLeafColumns().map((c) => c.id)).toEqual([
      "__row-gutter__",
      "name",
    ])
    // Arrow-right from the (only) real column should be a no-op — the
    // gutter column must not be a stop in keyboard navigation.
    act(() => result.current.runtime.setActiveCell({ rowId: "1", columnId: "name" }))
    act(() => result.current.runtime.moveActive("next"))
    expect(result.current.runtime.activeCell?.columnId).not.toBe("__row-gutter__")
  })

  it("without enableRowSelection, no gutter column is added", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (row) => row.id }),
    )
    expect(result.current.table.getAllLeafColumns().map((c) => c.id)).toEqual(["name"])
  })

  it("runtime exposes manualPagination and totalRowCount as passed", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name")],
        getRowId: (row) => row.id,
        manualPagination: true,
        totalRowCount: 500,
      }),
    )
    expect(result.current.runtime.manualPagination).toBe(true)
    expect(result.current.runtime.totalRowCount).toBe(500)
  })

  it("setAllMatchingSelected(true) sets the flag and selects every loaded row", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name")],
        getRowId: (row) => row.id,
        enableRowSelection: true,
        manualPagination: true,
        totalRowCount: 500,
      }),
    )
    act(() => result.current.runtime.setAllMatchingSelected(true))
    expect(result.current.runtime.isAllMatchingSelected).toBe(true)
    expect(result.current.table.getIsAllRowsSelected()).toBe(true)
  })

  it("setAllMatchingSelected(false) clears the flag without forcing deselection", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name")],
        getRowId: (row) => row.id,
        enableRowSelection: true,
      }),
    )
    act(() => result.current.runtime.setAllMatchingSelected(true))
    act(() => result.current.runtime.setAllMatchingSelected(false))
    expect(result.current.runtime.isAllMatchingSelected).toBe(false)
    // Rows stay selected — the row-gutter's own header click handler is the
    // one that decides whether clearing all-matching should also clear
    // every row (see row-gutter.test.tsx's "clears everything" case, which
    // exercises both calls together through the header's own click logic).
    expect(result.current.table.getIsAllRowsSelected()).toBe(true)
  })
})
```

Add to `components/data-table/data-table.test.tsx`:

```tsx
describe("DataTable — row selection", () => {
  it("renders the gutter column and its checkboxes when enableRowSelection is true", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} enableRowSelection />)
    // Header select-all checkbox + one per visible row.
    expect(screen.getAllByRole("checkbox")).toHaveLength(1 + DATA.length)
  })

  it("does not render the gutter column by default", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    expect(screen.queryByRole("checkbox")).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx components/data-table/data-table.test.tsx`
Expected: FAIL — `enableRowSelection` doesn't exist on the options type / no gutter column appears.

- [ ] **Step 3: Wire it up in `use-data-table.ts`**

In `components/data-table/use-data-table.ts`, add imports:

```ts
import { buildRowGutterColumn, ROW_GUTTER_COLUMN_ID } from "./row-gutter"
import type {
  DataTableColumnMeta,
  DataTableRuntime,
} from "./types"
```

(the existing `type { DataTableColumnMeta, DataTableRuntime } from "./types"` import line already exists — just confirm it's unchanged; the new import is `row-gutter`.)

Also add `RowSelectionState` to the `@tanstack/react-table` import list at the top of the file (alongside the existing `SortingState`, `ColumnPinningState`, etc.).

Extend `UseDataTableOptions`:

```ts
export type UseDataTableOptions<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  getRowId?: (row: TData, index: number) => string
  editable?: boolean
  onUpdateData?: (rowId: string, columnId: string, value: unknown) => void
  enablePagination?: boolean
  /** Prepends the row-number/selection gutter column. Defaults to false. */
  enableRowSelection?: boolean
  /** True when pagination is server-driven — loaded rows aren't necessarily all rows. Defaults to false. */
  manualPagination?: boolean
  /** Total row count across all pages/filters when manualPagination is true. */
  totalRowCount?: number
}
```

Inside `useDataTable`, add the new destructured options (with defaults) alongside the existing ones:

```ts
export function useDataTable<TData>({
  data,
  columns,
  getRowId,
  editable = false,
  onUpdateData,
  enablePagination = true,
  enableRowSelection = false,
  manualPagination = false,
  totalRowCount,
}: UseDataTableOptions<TData>): UseDataTableResult<TData> {
```

Add a `rowSelection` state and an `isAllMatchingSelected` state, alongside the existing `sorting`/`columnVisibility`/etc. state:

```ts
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [isAllMatchingSelected, setIsAllMatchingSelectedState] = React.useState(false)
```

Prepend the gutter column when `enableRowSelection` is on, right before the `useReactTable` call:

```ts
  const resolvedColumns = React.useMemo(
    () => (enableRowSelection ? [buildRowGutterColumn<TData>(), ...columns] : columns),
    [enableRowSelection, columns],
  )
```

Update the `useReactTable` call: use `resolvedColumns` instead of `columns`, add `rowSelection` to `state`, add `onRowSelectionChange: setRowSelection`, and add `enableRowSelection`:

```ts
  const table = useReactTable<TData>({
    data,
    columns: resolvedColumns,
    getRowId: getRowId ?? ((row, index) => String(index)),
    state: {
      sorting,
      columnVisibility,
      columnPinning,
      columnSizing,
      rowSelection,
      ...(enablePagination ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    enableRowSelection,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(enablePagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    autoResetPageIndex: false,
  })
```

Update the `columnIds` memo to exclude the gutter column, so `useGridNavigation`'s arrow-key/Tab movement skips over it entirely (it's structural, not an editable-grid cell):

```ts
  const visibleColumns = table.getVisibleLeafColumns()
  const columnIds = React.useMemo(
    () => visibleColumns.filter((c) => c.id !== ROW_GUTTER_COLUMN_ID).map((c) => c.id),
    [visibleColumns],
  )
```

Add `setAllMatchingSelected`, right after `table` is defined (it needs `table.toggleAllRowsSelected`):

```ts
  const setAllMatchingSelected = React.useCallback(
    (matching: boolean) => {
      setIsAllMatchingSelectedState(matching)
      if (matching) table.toggleAllRowsSelected(true)
    },
    [table],
  )
```

Finally, extend the `runtime` object at the bottom of the function:

```ts
  const runtime: DataTableRuntime = {
    ...nav,
    isColumnEditable,
    updateData,
    manualPagination,
    totalRowCount,
    isAllMatchingSelected,
    setAllMatchingSelected,
  }
```

- [ ] **Step 4: Wire the new props through `DataTable`**

In `components/data-table/data-table.tsx`, extend `DataTableProps`:

```ts
export type DataTableProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  getRowId?: (row: TData, index: number) => string
  editable?: boolean
  onUpdateData?: (rowId: string, columnId: string, value: unknown) => void
  enablePagination?: boolean
  enableRowSelection?: boolean
  manualPagination?: boolean
  totalRowCount?: number
}
```

`DataTable<TData>(props: DataTableProps<TData>)` already spreads `props` straight into `useDataTable(props)` — no other change needed in the component body for this task; the new fields flow through automatically.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx components/data-table/data-table.test.tsx`
Expected: PASS (all tests, existing + new — 5 new in `use-data-table.test.tsx`, 2 new in `data-table.test.tsx`).

- [ ] **Step 6: Run the broader regression + lint + typecheck**

Run: `pnpm exec vitest run components/data-table/ components/table-fields/` (should be 100% pass, was 187/187 before this task's file changes — will grow by 7).
Run: `pnpm exec eslint components/data-table/use-data-table.ts components/data-table/data-table.tsx components/data-table/use-data-table.test.tsx components/data-table/data-table.test.tsx`, then `pnpm typecheck`.

- [ ] **Step 7: Commit**

```bash
git add components/data-table/use-data-table.ts components/data-table/use-data-table.test.tsx components/data-table/data-table.tsx components/data-table/data-table.test.tsx
git commit -m "feat(data-table): wire row selection + manualPagination/totalRowCount into useDataTable

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

**Two deviations, both spec-verified sound:** (1) `data-table.tsx`'s header rendering had a genuine pre-existing gap — it unconditionally routed every column through `<ColumnHeader label={...} />`, ignoring `columnDef.header` entirely, invisible until now since every `defineColumns`-built column always sets `meta`. Fixed by branching: `meta`-bearing columns keep `ColumnHeader`; meta-less structural columns (the gutter) `flexRender` their own real `header`. Confirmed non-regressive (every existing column still has `meta`). (2) This plan's own literal test ("renders the gutter column and its checkboxes... immediately on render") contradicted Task 2's already-shipped, already-tested hover-reveal design (per-row checkboxes only mount on hover or selection, never all-at-once with nothing selected) — fixed by adjusting the TEST (click select-all first, then assert the count), not regressing Task 2's shipped behavior. Quality review found no blocking issues; added one inline comment documenting `setAllMatchingSelected`'s on/off asymmetry (previously only explained one level up in `types.ts`). Full repo suite: 208/208. Final commit `1df3a01`.

---

## Task 4: `useFooterAggregation` — scope resolution + client-side aggregation

**Files:**
- Create: `components/data-table/use-footer-aggregation.ts`
- Test: `components/data-table/use-footer-aggregation.test.ts`

**Interfaces:**
- Consumes: `aggregate` (Task 1); `CalculableColumn`, `AggregationMethod`, `AggregateCellState` (Task 1).
- Produces: `useFooterAggregation<TData>(opts): FooterAggregationResult` where `FooterAggregationResult = { methods, setMethod, stateFor, scopeIsSelection, calculate }`. Task 5 extends this same file with the hybrid/server path; Task 6's UI consumes `stateFor`/`setMethod`/`calculate`/`scopeIsSelection`.

This task builds the hook WITHOUT the hybrid/server state machine (that's Task 5) — `stateFor` only computes from loaded rows via `aggregate()`. `calculate` exists in the type from the start (so Task 5 doesn't change the public shape) but is a no-op until Task 5.

- [ ] **Step 1: Write the failing test**

Create `components/data-table/use-footer-aggregation.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react"
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { useFooterAggregation } from "./use-footer-aggregation"

type Row = { id: string; name: string; amount: number }

const DATA: Row[] = [
  { id: "1", name: "a", amount: 10 },
  { id: "2", name: "b", amount: 20 },
  { id: "3", name: "c", amount: 30 },
]

function useTestTable(data: Row[] = DATA) {
  return useReactTable<Row>({
    data,
    columns: [
      { id: "name", accessorKey: "name" },
      { id: "amount", accessorKey: "amount" },
    ],
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { rowSelection: {} },
    onRowSelectionChange: () => {},
    enableRowSelection: true,
  })
}

describe("useFooterAggregation — scope + client aggregation", () => {
  it("defaults each calculable column's method from calculableColumns[].default", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
      })
    })
    expect(result.current.methods.amount).toBe("sum")
  })

  it("stateFor returns undefined for a non-calculable column, or a calculable column with no method set", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount" }],
        isAllMatchingSelected: false,
      })
    })
    expect(result.current.stateFor("name")).toBeUndefined()
    expect(result.current.stateFor("amount")).toBeUndefined()
  })

  it("computes the aggregate over all visible rows when nothing is selected", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
      })
    })
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 60 })
    expect(result.current.scopeIsSelection).toBe(false)
  })

  it("switches scope to the selection once rows are selected", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      React.useEffect(() => {
        table.getRow("1").toggleSelected(true)
        table.getRow("2").toggleSelected(true)
      }, [table])
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
      })
    })
    expect(result.current.scopeIsSelection).toBe(true)
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 30 })
  })

  it("setMethod updates the live method for a column", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount" }],
        isAllMatchingSelected: false,
      })
    })
    act(() => result.current.setMethod("amount", "avg"))
    expect(result.current.methods.amount).toBe("avg")
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 20 })
    act(() => result.current.setMethod("amount", null))
    expect(result.current.stateFor("amount")).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/use-footer-aggregation.test.ts`
Expected: FAIL — cannot resolve `./use-footer-aggregation`.

- [ ] **Step 3: Implement `use-footer-aggregation.ts`**

Create `components/data-table/use-footer-aggregation.ts`:

```ts
"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"

import { aggregate } from "./aggregate"
import type {
  AggregateCellState,
  AggregationMethod,
  CalculableColumn,
  ComputeAggregateArgs,
} from "./types"

export type UseFooterAggregationOptions<TData> = {
  table: Table<TData>
  calculableColumns?: CalculableColumn[]
  computeAggregate?: (args: ComputeAggregateArgs) => Promise<number>
  manualPagination?: boolean
  totalRowCount?: number
  isAllMatchingSelected: boolean
}

export type FooterAggregationResult = {
  /** Live method per calculable column; null means "off" (no footer value shown). */
  methods: Record<string, AggregationMethod | null>
  setMethod: (columnId: string, method: AggregationMethod | null) => void
  /** Resolved display state for a column's current method, or undefined if the column isn't calculable or its method is off. */
  stateFor: (columnId: string) => AggregateCellState | undefined
  /** True when the footer is summarizing a selection rather than all visible rows. */
  scopeIsSelection: boolean
  /** Re-requests a server value for a column currently showing a "Calculate" trigger (idle) or a stale value. No-op until Task 5 wires computeAggregate. */
  calculate: (columnId: string) => void
}

export function useFooterAggregation<TData>({
  table,
  calculableColumns = [],
  isAllMatchingSelected,
}: UseFooterAggregationOptions<TData>): FooterAggregationResult {
  const columnConfig = React.useMemo(() => {
    const map = new Map<string, CalculableColumn>()
    for (const c of calculableColumns) map.set(c.columnId, c)
    return map
  }, [calculableColumns])

  const [methods, setMethods] = React.useState<Record<string, AggregationMethod | null>>(() => {
    const initial: Record<string, AggregationMethod | null> = {}
    for (const c of calculableColumns) initial[c.columnId] = c.default ?? null
    return initial
  })

  const setMethod = React.useCallback((columnId: string, method: AggregationMethod | null) => {
    setMethods((prev) => ({ ...prev, [columnId]: method }))
  }, [])

  const selectedRows = table.getSelectedRowModel().rows
  const scopeIsSelection = isAllMatchingSelected || selectedRows.length > 0
  const scopeRows = scopeIsSelection ? selectedRows : table.getSortedRowModel().rows

  const stateFor = React.useCallback(
    (columnId: string): AggregateCellState | undefined => {
      const method = methods[columnId]
      if (!columnConfig.has(columnId) || !method) return undefined
      const values = scopeRows.map((row) => row.getValue(columnId) as number | null | undefined)
      return { status: "value", value: aggregate(method, values) }
    },
    [methods, columnConfig, scopeRows],
  )

  const calculate = React.useCallback((_columnId: string) => {
    // No-op until Task 5 adds the hybrid client/server state machine.
  }, [])

  return { methods, setMethod, stateFor, scopeIsSelection, calculate }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/use-footer-aggregation.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/data-table/use-footer-aggregation.ts components/data-table/use-footer-aggregation.test.ts` (the unused `computeAggregate`/`manualPagination`/`totalRowCount` destructured-but-unused options will need `_`-prefixing or omission from the destructure — omit them from the destructure entirely in this task's version, since Task 5 adds them back when it uses them; adjust `UseFooterAggregationOptions` usage accordingly if eslint's `no-unused-vars` flags the omission), then `pnpm typecheck`.

```bash
git add components/data-table/use-footer-aggregation.ts components/data-table/use-footer-aggregation.test.ts
git commit -m "feat(data-table): add useFooterAggregation (scope resolution + client aggregation)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

**Deviation, found and verified by empirical revert-and-retest:** this plan's own given test fixture (`useTestTable`) hardcoded `state: { rowSelection: {} }` with a no-op `onRowSelectionChange` — a frozen, uncontrolled TanStack state key that can never actually update (confirmed by tracing TanStack's own controlled-state merge logic AND by temporarily reverting to the exact original fixture and re-running: only the "switches scope to the selection" test failed, exactly as predicted). Fixed with a real `React.useState`-backed controlled-selection pattern. The implementation itself is verbatim, zero deviation. Code-quality review found no issues — the no-op `calculate` stub, unmemoized-but-safe `stateFor` dependencies (TanStack's own row-model getters are internally memoized), and the unchecked `getValue` cast were all confirmed intentional/pre-existing-precedent, not new defects. Full repo suite: 213/213. Commit `2f5b360`.

---

## Task 5: `useFooterAggregation` — hybrid client/server state machine

**Files:**
- Modify: `components/data-table/use-footer-aggregation.ts`
- Modify: `components/data-table/use-footer-aggregation.test.ts`

**Interfaces:**
- No change to `FooterAggregationResult`'s shape (already declared in Task 4) — `calculate` becomes real, `stateFor` gains the hybrid branch.

- [ ] **Step 1: Write the failing tests**

Add to `components/data-table/use-footer-aggregation.test.ts`:

```ts
describe("useFooterAggregation — hybrid client/server", () => {
  it("computes client-side when manualPagination is on but totalRowCount matches loaded rows", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: DATA.length,
      })
    })
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 60 })
  })

  it("shows an idle 'Calculate' state when the scope exceeds loaded rows and computeAggregate is provided", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: 1000,
        computeAggregate: async () => 999,
      })
    })
    expect(result.current.stateFor("amount")).toEqual({ status: "idle" })
  })

  it("calculate() runs computeAggregate with the right args and resolves to a value", async () => {
    const computeAggregate = vi.fn().mockResolvedValue(999)
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: 1000,
        computeAggregate,
      })
    })
    await act(async () => result.current.calculate("amount"))
    expect(computeAggregate).toHaveBeenCalledWith({
      columnId: "amount",
      method: "sum",
      scope: "all-matching",
    })
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 999 })
  })

  it("calculate() surfaces a rejected computeAggregate as an error state", async () => {
    const computeAggregate = vi.fn().mockRejectedValue(new Error("boom"))
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: 1000,
        computeAggregate,
      })
    })
    await act(async () => result.current.calculate("amount"))
    expect(result.current.stateFor("amount")).toEqual({ status: "error", message: "boom" })
  })

  it("a resolved value goes stale when the method changes, and calculate() clears it back to a fresh value", async () => {
    const computeAggregate = vi.fn().mockResolvedValue(999)
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: 1000,
        computeAggregate,
      })
    })
    await act(async () => result.current.calculate("amount"))
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 999 })

    act(() => result.current.setMethod("amount", "avg"))
    expect(result.current.stateFor("amount")).toEqual({ status: "stale", value: 999 })

    computeAggregate.mockResolvedValue(42)
    await act(async () => result.current.calculate("amount"))
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 42 })
  })

  it("gracefully falls back to loaded-rows-only, marked partial, when the scope exceeds loaded and no computeAggregate is provided", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: 1000,
      })
    })
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 60, partial: true })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/data-table/use-footer-aggregation.test.ts`
Expected: FAIL — the new hybrid-scenario tests don't match Task 4's no-op `calculate`/purely-client `stateFor`.

- [ ] **Step 3: Extend `use-footer-aggregation.ts`**

Replace the whole file with:

```ts
"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"

import { aggregate } from "./aggregate"
import type {
  AggregateCellState,
  AggregationMethod,
  CalculableColumn,
  ComputeAggregateArgs,
} from "./types"

export type UseFooterAggregationOptions<TData> = {
  table: Table<TData>
  calculableColumns?: CalculableColumn[]
  computeAggregate?: (args: ComputeAggregateArgs) => Promise<number>
  manualPagination?: boolean
  totalRowCount?: number
  isAllMatchingSelected: boolean
}

export type FooterAggregationResult = {
  /** Live method per calculable column; null means "off" (no footer value shown). */
  methods: Record<string, AggregationMethod | null>
  setMethod: (columnId: string, method: AggregationMethod | null) => void
  /** Resolved display state for a column's current method, or undefined if the column isn't calculable or its method is off. */
  stateFor: (columnId: string) => AggregateCellState | undefined
  /** True when the footer is summarizing a selection rather than all visible rows. */
  scopeIsSelection: boolean
  /** Re-requests a server value for a column currently showing a "Calculate" trigger (idle) or a stale value. */
  calculate: (columnId: string) => void
}

export function useFooterAggregation<TData>({
  table,
  calculableColumns = [],
  computeAggregate,
  manualPagination = false,
  totalRowCount,
  isAllMatchingSelected,
}: UseFooterAggregationOptions<TData>): FooterAggregationResult {
  const columnConfig = React.useMemo(() => {
    const map = new Map<string, CalculableColumn>()
    for (const c of calculableColumns) map.set(c.columnId, c)
    return map
  }, [calculableColumns])

  const [methods, setMethods] = React.useState<Record<string, AggregationMethod | null>>(() => {
    const initial: Record<string, AggregationMethod | null> = {}
    for (const c of calculableColumns) initial[c.columnId] = c.default ?? null
    return initial
  })

  const setMethod = React.useCallback((columnId: string, method: AggregationMethod | null) => {
    setMethods((prev) => ({ ...prev, [columnId]: method }))
  }, [])

  const selectedRows = table.getSelectedRowModel().rows
  const scopeIsSelection = isAllMatchingSelected || selectedRows.length > 0
  const scopeRows = scopeIsSelection ? selectedRows : table.getSortedRowModel().rows

  const loadedRowCount = table.getSortedRowModel().rows.length
  // Only the all-matching selection can ever exceed what's loaded — a
  // hand-picked selection of specific rows is, by definition, a selection of
  // rows the user could see (and therefore rows already loaded).
  const scopeExceedsLoaded =
    manualPagination &&
    totalRowCount !== undefined &&
    (scopeIsSelection ? isAllMatchingSelected : totalRowCount > loadedRowCount)

  const [serverStates, setServerStates] = React.useState<Record<string, AggregateCellState>>({})

  const calculate = React.useCallback(
    (columnId: string) => {
      const method = methods[columnId]
      if (!method || !computeAggregate) return
      setServerStates((prev) => ({ ...prev, [columnId]: { status: "loading" } }))
      computeAggregate({
        columnId,
        method,
        scope: scopeIsSelection ? "selection-all-matching" : "all-matching",
      })
        .then((value) => {
          setServerStates((prev) => ({ ...prev, [columnId]: { status: "value", value } }))
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to calculate"
          setServerStates((prev) => ({ ...prev, [columnId]: { status: "error", message } }))
        })
    },
    [methods, computeAggregate, scopeIsSelection],
  )

  // A resolved server value goes stale when its inputs (method or scope)
  // change since it was last requested — re-derive an identity key per
  // column each render and compare against what was last seen.
  const requestKeyRef = React.useRef<Record<string, string>>({})
  React.useEffect(() => {
    for (const columnId of columnConfig.keys()) {
      const method = methods[columnId]
      const key = `${method ?? ""}:${scopeIsSelection ? "selection" : "all"}`
      const prevKey = requestKeyRef.current[columnId]
      if (prevKey !== undefined && prevKey !== key) {
        setServerStates((prev) => {
          const existing = prev[columnId]
          if (existing?.status === "value") {
            return { ...prev, [columnId]: { status: "stale", value: existing.value } }
          }
          return prev
        })
      }
      requestKeyRef.current[columnId] = key
    }
  }, [methods, scopeIsSelection, columnConfig])

  const stateFor = React.useCallback(
    (columnId: string): AggregateCellState | undefined => {
      const method = methods[columnId]
      if (!columnConfig.has(columnId) || !method) return undefined

      if (scopeExceedsLoaded && computeAggregate) {
        return serverStates[columnId] ?? { status: "idle" }
      }

      const values = scopeRows.map((row) => row.getValue(columnId) as number | null | undefined)
      const value = aggregate(method, values)
      return scopeExceedsLoaded
        ? { status: "value", value, partial: true }
        : { status: "value", value }
    },
    [methods, columnConfig, scopeExceedsLoaded, computeAggregate, serverStates, scopeRows],
  )

  return { methods, setMethod, stateFor, scopeIsSelection, calculate }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/data-table/use-footer-aggregation.test.ts`
Expected: PASS (11 tests: 5 from Task 4 + 6 new).

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/data-table/use-footer-aggregation.ts components/data-table/use-footer-aggregation.test.ts`, then `pnpm typecheck`.

```bash
git add components/data-table/use-footer-aggregation.ts components/data-table/use-footer-aggregation.test.ts
git commit -m "feat(data-table): add hybrid client/server state machine to useFooterAggregation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Independently spec-verified byte-for-byte against this plan's given code (implementation and all 6 new tests). Code-quality review found a real, Critical race condition: `calculate()`'s promise continuations wrote unconditionally into `serverStates`, so a stale in-flight request resolving AFTER a newer request was issued for the same column would silently overwrite the fresher result with no visual indication anything was wrong (reachable simply by changing the aggregation method while a calculation is in flight — no double-click needed). Fixed with a per-column monotonic request-id guard (`requestIdRef`), coexisting with the separate staleness-detection effect. A regression test (two overlapping `calculate()` calls resolved out of arrival order) was added and empirically verified to fail against the pre-fix code and pass post-fix. Full repo suite: 139/139 in `components/data-table/`+`components/table-fields/`. Final commit `bdbe056`.

---

## Task 6: `TableFooter` primitive + footer UI

**Files:**
- Modify: `components/ui/table.tsx`
- Create: `components/data-table/footer-aggregation.tsx`
- Test: `components/data-table/footer-aggregation.test.tsx`

**Interfaces:**
- Consumes: `AGGREGATION_METHOD_LABELS`, `ALL_AGGREGATION_METHODS` (Task 1); `FooterAggregationResult` (Task 4/5); `DataTableColumnMeta` (existing).
- Produces: `TableFooter` (exported from `components/ui/table.tsx`, alongside the existing `Table`/`TableHeader`/etc.); `DataTableFooter<TData>({ table, aggregation })` (Task 7 renders this inside `DataTable`).

- [ ] **Step 1: Check whether stock shadcn's `table.tsx` already has `TableFooter`**

Before writing code, check the upstream reference (via Context7 or the shadcn docs) for whether the standard `table` registry item ships a `TableFooter` export. If it does, mirror its exact shape (props, className) rather than inventing a new one — that keeps this repo's local copy in parity with what a fresh `npx shadcn add table` install already provides.

- [ ] **Step 2: Add `TableFooter` to `components/ui/table.tsx`**

Add this function to `components/ui/table.tsx`, after `TableBody` and before `TableRow`:

```tsx
function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("bg-muted/50 border-t font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  )
}
```

Add `TableFooter` to the `export { ... }` block at the bottom of the file.

- [ ] **Step 3: Write the failing test for `footer-aggregation.tsx`**

Create `components/data-table/footer-aggregation.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { describe, expect, it, vi } from "vitest"

import { DataTableFooter } from "./footer-aggregation"
import type { FooterAggregationResult } from "./use-footer-aggregation"

type Row = { id: string; name: string; amount: number }

const DATA: Row[] = [{ id: "1", name: "a", amount: 10 }]

function useTestTable() {
  return useReactTable<Row>({
    data: DATA,
    columns: [
      { id: "name", accessorKey: "name", meta: { label: "Name" } },
      { id: "amount", accessorKey: "amount", meta: { label: "Amount" } },
    ],
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  })
}

function stubAggregation(overrides: Partial<FooterAggregationResult> = {}): FooterAggregationResult {
  return {
    methods: { amount: "sum" },
    setMethod: vi.fn(),
    stateFor: (columnId) =>
      columnId === "amount" ? { status: "value", value: 10 } : undefined,
    scopeIsSelection: false,
    calculate: vi.fn(),
    ...overrides,
  }
}

function Harness({ aggregation }: { aggregation: FooterAggregationResult }) {
  const table = useTestTable()
  return <table><DataTableFooter table={table} aggregation={aggregation} /></table>
}

describe("DataTableFooter", () => {
  it("renders nothing when there are no calculable columns", () => {
    const { container } = render(<Harness aggregation={stubAggregation({ methods: {} })} />)
    expect(container.querySelector("tfoot")).toBeNull()
  })

  it("shows the picked method's value for a calculable column, and an empty cell for a non-calculable one", () => {
    render(<Harness aggregation={stubAggregation()} />)
    expect(screen.getByText("Sum")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
  })

  it("shows a Calculate trigger for an idle server state, and calls calculate() on click", () => {
    const calculate = vi.fn()
    render(
      <Harness
        aggregation={stubAggregation({
          stateFor: (columnId) => (columnId === "amount" ? { status: "idle" } : undefined),
          calculate,
        })}
      />,
    )
    fireEvent.click(screen.getByText("Calculate"))
    expect(calculate).toHaveBeenCalledWith("amount")
  })

  it("shows a partial-value qualifier when the graceful client-only fallback is active", () => {
    render(
      <Harness
        aggregation={stubAggregation({
          stateFor: (columnId) =>
            columnId === "amount" ? { status: "value", value: 10, partial: true } : undefined,
        })}
      />,
    )
    expect(screen.getByText("(loaded rows)")).toBeInTheDocument()
  })

  it("opens the method picker and calls setMethod on a choice", () => {
    const setMethod = vi.fn()
    render(<Harness aggregation={stubAggregation({ setMethod })} />)
    fireEvent.click(screen.getByText("Sum"))
    fireEvent.click(screen.getByText("Average"))
    expect(setMethod).toHaveBeenCalledWith("amount", "avg")
  })
})
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/data-table/footer-aggregation.test.tsx`
Expected: FAIL — cannot resolve `./footer-aggregation`.

- [ ] **Step 5: Implement `footer-aggregation.tsx`**

Create `components/data-table/footer-aggregation.tsx`:

```tsx
"use client"

import type { Column, Table } from "@tanstack/react-table"
import { Loader2 } from "lucide-react"
import * as React from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TableCell, TableFooter, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { AGGREGATION_METHOD_LABELS, ALL_AGGREGATION_METHODS } from "./aggregate"
import type { FooterAggregationResult } from "./use-footer-aggregation"
import type { AggregationMethod } from "./types"

function formatValue(value: number): string {
  if (Number.isNaN(value)) return "—"
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
}

function FooterMethodPicker({
  method,
  onPick,
}: {
  method: AggregationMethod | null
  onPick: (method: AggregationMethod | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(p) => (
          <button
            {...p}
            type="button"
            className="rounded-sm px-1.5 py-0.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          />
        )}
      >
        {method ? AGGREGATION_METHOD_LABELS[method] : "—"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-36 p-1">
        <button
          type="button"
          className={cn(
            "w-full rounded-sm px-2 py-1 text-left text-sm hover:bg-muted",
            method === null && "font-medium",
          )}
          onClick={() => {
            onPick(null)
            setOpen(false)
          }}
        >
          None
        </button>
        {ALL_AGGREGATION_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            className={cn(
              "w-full rounded-sm px-2 py-1 text-left text-sm hover:bg-muted",
              method === m && "font-medium",
            )}
            onClick={() => {
              onPick(m)
              setOpen(false)
            }}
          >
            {AGGREGATION_METHOD_LABELS[m]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function FooterValueCell<TData>({
  column,
  aggregation,
}: {
  column: Column<TData, unknown>
  aggregation: FooterAggregationResult
}) {
  const isCalculable = aggregation.methods[column.id] !== undefined
  if (!isCalculable) return <TableCell className="p-0" />

  const method = aggregation.methods[column.id] ?? null
  const state = aggregation.stateFor(column.id)

  return (
    <TableCell className="p-0 align-middle">
      <div className="flex items-center justify-between gap-1 px-1 py-1">
        <FooterMethodPicker method={method} onPick={(m) => aggregation.setMethod(column.id, m)} />
        {method && state ? (
          <span className="truncate text-right text-xs tabular-nums text-muted-foreground">
            {state.status === "idle" ? (
              <button type="button" className="underline" onClick={() => aggregation.calculate(column.id)}>
                Calculate
              </button>
            ) : state.status === "loading" ? (
              <Loader2 className="ml-auto size-3 animate-spin" aria-label="Calculating" />
            ) : state.status === "error" ? (
              <button
                type="button"
                className="text-destructive underline"
                onClick={() => aggregation.calculate(column.id)}
              >
                Retry
              </button>
            ) : (
              <>
                {formatValue(state.value)}
                {state.partial ? <span className="ml-1 opacity-70">(loaded rows)</span> : null}
                {state.status === "stale" ? (
                  <button
                    type="button"
                    className="ml-1 underline"
                    onClick={() => aggregation.calculate(column.id)}
                  >
                    refresh
                  </button>
                ) : null}
              </>
            )}
          </span>
        ) : null}
      </div>
    </TableCell>
  )
}

export function DataTableFooter<TData>({
  table,
  aggregation,
}: {
  table: Table<TData>
  aggregation: FooterAggregationResult
}) {
  const hasAnyCalculable = Object.keys(aggregation.methods).length > 0
  if (!hasAnyCalculable) return null

  return (
    <TableFooter>
      <TableRow>
        {table.getVisibleLeafColumns().map((column) => (
          <FooterValueCell key={column.id} column={column} aggregation={aggregation} />
        ))}
      </TableRow>
    </TableFooter>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/data-table/footer-aggregation.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 7: Lint + typecheck + commit**

Run: `pnpm exec eslint components/ui/table.tsx components/data-table/footer-aggregation.tsx components/data-table/footer-aggregation.test.tsx`, then `pnpm typecheck`.

```bash
git add components/ui/table.tsx components/data-table/footer-aggregation.tsx components/data-table/footer-aggregation.test.tsx
git commit -m "feat(data-table): add TableFooter primitive + footer aggregation UI

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

**Deviation, found by code-quality review:** `TableFooter` was independently confirmed byte-for-byte identical to stock shadcn/ui's own `table.tsx` (fetched live via `gh api`), so no deviation there. `footer-aggregation.tsx`'s `FooterMethodPicker` trigger, however, exposed only a bare method label ("Sum", "—", etc.) with no `aria-label` identifying which column it controlled — with 2+ calculable columns (as this same plan's Task 10 demo wires up), a screen reader user would hear indistinguishable "Sum, button" / "Sum, button" announcements. This mirrors the exact `aria-label` convention already established in `column-header.tsx` and `columns-menu.tsx` earlier in this plan/session. Fixed by threading the column's `meta.label` into `FooterMethodPicker` and building `` `${columnLabel} aggregation: ${method label or "off"}` ``; added a 6th test asserting two columns' triggers get distinct, column-labeled accessible names. `formatValue`'s fixed `en-US`/no-currency formatting and `FooterValueCell`'s `method && state` branch were both investigated and confirmed non-issues (the former is out of scope — `CalculableColumn` carries no field-type metadata to draw from; the latter is unreachable with the real `useFooterAggregation` hook, only a theoretical gap in the test-stub harness). Full `footer-aggregation` suite: 6/6. Typecheck clean. Lint clean (no new warnings; only pre-existing unrelated warnings elsewhere in the repo).

---

## Task 7: Wire footer calc into `DataTable`

**Files:**
- Modify: `components/data-table/data-table.tsx`
- Modify: `components/data-table/data-table.test.tsx`

**Interfaces:**
- Consumes: `useFooterAggregation` (Task 4/5), `DataTableFooter` (Task 6).
- Produces: `DataTableProps.calculableColumns?`, `.computeAggregate?` — the last two public props this plan adds.

- [ ] **Step 1: Write the failing test**

Add to `components/data-table/data-table.test.tsx`:

```tsx
describe("DataTable — footer calc", () => {
  it("renders a footer with the aggregated value when calculableColumns is set", () => {
    render(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        calculableColumns={[{ columnId: "age", default: "sum" }]}
      />,
    )
    // Fixture is DATA = [{ age: 44 }, { age: 30 }] (see the top of this
    // file) — sum is 74, confirmed against the actual fixture rather than
    // computed at test-run time, so a future edit to DATA that silently
    // changes the sum makes this test fail loudly instead of drifting.
    expect(screen.getByText("74")).toBeInTheDocument()
  })

  it("renders no footer when calculableColumns is not set", () => {
    const { container } = render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    expect(container.querySelector("tfoot")).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/data-table.test.tsx`
Expected: FAIL — `calculableColumns` doesn't exist on `DataTableProps`, no footer renders.

- [ ] **Step 3: Wire it up**

In `components/data-table/data-table.tsx`, add two new import lines:

```ts
import { DataTableFooter } from "./footer-aggregation"
import { useFooterAggregation } from "./use-footer-aggregation"
```

Then modify the file's EXISTING `import type { DataTableColumnMeta } from "./types"` line (do not add a second, duplicate import of `DataTableColumnMeta` — this file already imports it for the column-header label lookup) to also pull in the two new types:

```ts
import type { CalculableColumn, ComputeAggregateArgs, DataTableColumnMeta } from "./types"
```

Extend `DataTableProps`:

```ts
export type DataTableProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  getRowId?: (row: TData, index: number) => string
  editable?: boolean
  onUpdateData?: (rowId: string, columnId: string, value: unknown) => void
  enablePagination?: boolean
  enableRowSelection?: boolean
  manualPagination?: boolean
  totalRowCount?: number
  calculableColumns?: CalculableColumn[]
  computeAggregate?: (args: ComputeAggregateArgs) => Promise<number>
}
```

In the `DataTable` component body, after `const { table, runtime } = useDataTable(props)`, add:

```ts
  const aggregation = useFooterAggregation({
    table,
    calculableColumns: props.calculableColumns,
    computeAggregate: props.computeAggregate,
    manualPagination: props.manualPagination,
    totalRowCount: props.totalRowCount,
    isAllMatchingSelected: runtime.isAllMatchingSelected,
  })
```

Render `<DataTableFooter>` right after the closing `</TableBody>`, inside the existing `<Table>`:

```tsx
            </TableBody>
            <DataTableFooter table={table} aggregation={aggregation} />
          </Table>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/data-table.test.tsx`
Expected: PASS (all tests, existing + the 2 new footer tests).

- [ ] **Step 5: Run the broader regression + lint + typecheck**

Run: `pnpm exec vitest run components/data-table/ components/table-fields/` — expect 100% pass.
Run: `pnpm exec eslint components/data-table/data-table.tsx components/data-table/data-table.test.tsx`, then `pnpm typecheck`.

- [ ] **Step 6: Commit**

```bash
git add components/data-table/data-table.tsx components/data-table/data-table.test.tsx
git commit -m "feat(data-table): wire footer calc (calculableColumns, computeAggregate) into DataTable

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Barrel export

**Files:**
- Modify: `components/data-table/index.ts`
- Modify: `components/data-table/index.test.ts`

**Interfaces:**
- Produces: the full public surface of this plan, re-exported from `components/data-table`.

- [ ] **Step 1: Write the failing test**

Add these names to the existing `for (const name of [...])` array in `components/data-table/index.test.ts` (keep every existing name):

```ts
      "buildRowGutterColumn",
      "ROW_GUTTER_COLUMN_ID",
      "aggregate",
      "AGGREGATION_METHOD_LABELS",
      "ALL_AGGREGATION_METHODS",
      "useFooterAggregation",
      "DataTableFooter",
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/index.test.ts`
Expected: FAIL — `toHaveProperty` fails for the new names.

- [ ] **Step 3: Extend `index.ts`**

Add these export lines to `components/data-table/index.ts` (alongside the existing ones):

```ts
export { buildRowGutterColumn, ROW_GUTTER_COLUMN_ID } from "./row-gutter"
export { aggregate, AGGREGATION_METHOD_LABELS, ALL_AGGREGATION_METHODS } from "./aggregate"
export {
  useFooterAggregation,
  type UseFooterAggregationOptions,
  type FooterAggregationResult,
} from "./use-footer-aggregation"
export { DataTableFooter } from "./footer-aggregation"
```

Add these to the existing `export type { ... } from "./types"` block:

```ts
export type {
  CellPos,
  DataTableColumnMeta,
  DataTableRuntime,
  MoveDirection,
  AggregationMethod,
  CalculableColumn,
  ComputeAggregateArgs,
  AggregateCellState,
} from "./types"
```

- [ ] **Step 4: Run the test to verify it passes, then the full suite**

Run: `pnpm exec vitest run components/data-table/index.test.ts`
Expected: PASS.

Run: `pnpm exec vitest run components/data-table/ components/table-fields/`
Expected: 100% pass.

- [ ] **Step 5: Typecheck + lint + commit**

Run: `pnpm typecheck`, `pnpm exec eslint components/data-table/index.ts`.

```bash
git add components/data-table/index.ts components/data-table/index.test.ts
git commit -m "feat(data-table): export selection + footer-calc public surface from barrel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Registry item update + rebuild

**Files:**
- Modify: `registry.json`
- Rebuild: `public/r/data-table.json`, `public/r/data-table-radix.json`, `public/r/registry.json`

- [ ] **Step 1: Add the four new files to both `data-table` and `data-table-radix`'s `files` arrays**

In `registry.json`, find the `data-table` item's `files` array and add these four entries (position doesn't matter, but grouping them near the other `registry:lib`/`registry:component` entries keeps it readable):

```json
        { "path": "components/data-table/aggregate.ts", "type": "registry:lib", "target": "components/data-table/aggregate.ts" },
        { "path": "components/data-table/row-gutter.tsx", "type": "registry:component", "target": "components/data-table/row-gutter.tsx" },
        { "path": "components/data-table/use-footer-aggregation.ts", "type": "registry:hook", "target": "components/data-table/use-footer-aggregation.ts" },
        { "path": "components/data-table/footer-aggregation.tsx", "type": "registry:component", "target": "components/data-table/footer-aggregation.tsx" }
```

Add the identical four entries to the `data-table-radix` item's `files` array (these four files are base/Radix-agnostic — no `.radix.tsx` twin needed, matching how `column-header.tsx`/`columns-menu.tsx` are already shared as-is between both items).

- [ ] **Step 2: Validate JSON + build**

Run: `node -e "require('./registry.json')"` — expect no throw.
Run: `pnpm registry:build` — expect it rebuilds all 5 items with no error.

- [ ] **Step 3: Verify the built items**

Run:
```bash
node -e "const j=require('./public/r/data-table.json'); console.log(j.files.some(f=>f.path==='components/data-table/aggregate.ts'), j.files.some(f=>f.path==='components/data-table/footer-aggregation.tsx'))"
```
Expected output: `true true`

Run:
```bash
node -e "const j=require('./public/r/data-table.json'); console.log(j.files.every(f=>!f.path.includes('.test.')))"
```
Expected output: `true`

- [ ] **Step 4: Commit**

```bash
git add registry.json public/r/
git commit -m "feat(data-table): publish selection + footer-calc files in the registry

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Demo route — selection + footer calc example

**Files:**
- Modify: `app/(examples)/data-table-demo/columns.tsx`
- Modify: `app/(examples)/data-table-demo/data-table-client.tsx`

- [ ] **Step 1: Turn on selection and a calculable column in the demo**

In `app/(examples)/data-table-demo/data-table-client.tsx`, add `enableRowSelection` and `calculableColumns` to the `<DataTable>` call:

```tsx
    <DataTable<Task>
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      editable
      onUpdateData={handleUpdateData}
      enableRowSelection
      calculableColumns={[
        { columnId: "hoursLogged", default: "sum" },
        { columnId: "budget", methods: ["sum", "avg"], default: "sum" },
      ]}
    />
```

Update the component's doc comment to mention the new behavior being exercised:

```tsx
/**
 * Manual smoke-test harness for <DataTable>: `editable` is on at the table
 * level, three columns (`priority`, `hoursLogged`, `dueDate`) override it to
 * `editable: false` via `defineColumns`'s per-column `editable` option, and
 * `onUpdateData` mutates local state (not just console.log) so committed
 * edits are visibly reflected in the grid. `enableRowSelection` turns on the
 * row-number/checkbox gutter and tri-state select-all; `calculableColumns`
 * exercises the footer's method picker and client-side aggregation over
 * `hoursLogged`/`budget`.
 */
```

- [ ] **Step 2: Verify manually in the browser**

Run: start the dev server (`pnpm dev` or the project's preview tooling), navigate to `/data-table-demo`. Confirm:
- A leading gutter column appears with row numbers.
- Hovering a row (or clicking to select it) swaps its number for a checkbox.
- Clicking the header checkbox once selects the current page; a second click (if there's more than one page) selects everything loaded; with no server pagination configured in this demo, the tri-state naturally has only two real steps (page/all vs. none) since nothing exists beyond what's loaded — confirm this matches the Task 2 design (no third "all-matching" step appears, since `manualPagination` isn't set in this demo).
- A footer row appears under the last data row, showing "Sum" (or the picked method) for `hoursLogged` and `budget`, with correct totals.
- Clicking the footer's method label opens a popover to change the method; selecting a different one updates the displayed value.
- Selecting a subset of rows changes the footer's values to reflect only the selection (confirm `aggregation.scopeIsSelection` behavior end-to-end, not just in isolation).

If anything doesn't match, fix the source (not the demo) and re-verify.

- [ ] **Step 3: Typecheck + lint + commit**

Run: `pnpm typecheck`, `pnpm exec eslint "app/(examples)/data-table-demo/"`.

```bash
git add "app/(examples)/data-table-demo/columns.tsx" "app/(examples)/data-table-demo/data-table-client.tsx"
git commit -m "chore(data-table): exercise selection + footer calc in /data-table-demo

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full suite**

Run: `pnpm exec vitest run` — expect all suites pass (grouped-data-table + table-fields + data-table).

- [ ] **Step 2: Typecheck + lint + production build**

Run: `pnpm typecheck && pnpm exec eslint components/data-table components/table-fields components/ui && pnpm build` — expect all clean.

- [ ] **Step 3: Manual smoke test (browser)**

Using the `/data-table-demo` route updated in Task 10, verify the full interaction set end to end in a real browser (not just component tests, per the lesson from Plan 2's final review — jsdom's synthetic events don't always match real click/focus event ordering):
- Row selection via checkbox click, via row hover, and via the header tri-state control.
- Footer method picker + value display, including switching scope by selecting/deselecting rows.
- Existing grid features (sort, hide/pin columns, cell edit, keyboard nav) still work correctly with the gutter column present — confirm arrow-key navigation from the leftmost real data column doesn't try to stop on the gutter column.

- [ ] **Step 4: Final holistic review**

Dispatch a final code-quality review across the full branch diff (`git diff main...feat/data-table-selection-and-calc`), the same kind of integration-level pass done at the end of Plan 2 — it catches cross-file issues no single task's review can see (e.g., does the gutter column's presence interact correctly with pinned columns' sticky offset math? Does `isAllMatchingSelected` ever get left stale after a `data` prop change removes rows?).

- [ ] **Step 5: Finish the branch**

Use `superpowers:finishing-a-development-branch` to decide how to land this (merge to main, PR, etc.), following the same pattern as Plans 1 and 2.

---

## Self-Review notes (already applied)

- **Spec coverage:** row-number gutter + hover-to-checkbox ✓ Task 2; tri-state select-all (page → all-loaded → all-matching, correctly collapsing to fewer real steps when there's nothing beyond what's loaded) ✓ Task 2/3, verified against TanStack's actual `RowSelection.ts` source rather than assumed; footer calc with per-column method picker + selection-aware scope switching ✓ Tasks 4/6/7; hybrid client/server aggregation with the full `idle → loading → value → stale/error` state machine and the graceful "(loaded rows)" fallback ✓ Task 5. **Out of scope for this plan** (Plan 4): undo/redo, copy/paste/export, sonner toasts.
- **Type consistency:** `AggregationMethod`/`CalculableColumn`/`ComputeAggregateArgs`/`AggregateCellState` defined once in Task 1's `types.ts` and reused verbatim by every later task (`aggregate.ts`, `use-footer-aggregation.ts`, `footer-aggregation.tsx`, `data-table.tsx`). `FooterAggregationResult`'s shape is fixed in Task 4 and never changes across Task 5's extension — only its implementation gains real behavior, so Task 6's UI (written against Task 4's stub) doesn't need to change when Task 5 lands.
- **No placeholders:** every step has complete code and exact commands.
