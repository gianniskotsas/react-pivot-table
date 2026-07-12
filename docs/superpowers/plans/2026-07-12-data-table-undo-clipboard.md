# Data Table Undo/Redo + Clipboard + CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add undo/redo with sonner toast notifications, TSV copy/paste (Excel/Sheets-compatible), and CSV export to the already-shipped `<DataTable>` grid — the last unshipped slice of `docs/superpowers/specs/2026-07-11-datatable-architecture-design.md`.

**Architecture:** A pure, React-free history stack (`undo.ts`) tracked in a ref inside `use-data-table.ts`; every cell mutation (single edit, paste, bulk clear) captures its `{prev, next}` pair by reading the *current* value straight off the table (`table.getRow(id).getValue(columnId)`) before calling the consumer's `onUpdateData` — the library still never owns `data`, it just remembers what it told the consumer to change so it can tell them to change it back. Copy/paste/export are three pure, TanStack-agnostic modules (`clipboard.ts`, `export-csv.ts`) fed already-resolved values by thin React-level glue in `use-data-table.ts`/`data-table.tsx`. Keyboard shortcuts (Cmd/Ctrl+Z, +Shift+Z, +C, +V, Delete/Backspace) are handled by a new composed `handleKeyDown` in `use-data-table.ts` that intercepts these first and falls through to the existing grid-navigation handler for everything else — `use-grid-navigation.ts` itself stays untouched, preserving its established "pure navigation, no undo/clipboard concerns" scope.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, `@tanstack/react-table` v8, `sonner` (new dependency), Vitest + Testing Library + jsdom, base-ui primitives with a Radix dual-build.

## Global Constraints

- Match every existing convention from Plans 1-3 (already merged to `main`): TDD per task, subagent-driven-development execution, base-ui + `.radix.tsx` twins for anything whose API genuinely diverges between the two primitive libraries, `pnpm registry:build` after any registry-affecting change, full suite + typecheck + lint + build clean before every commit.
- The library **never owns `data`** — undo/redo, paste, and bulk-clear all report intended mutations through the *existing* `onUpdateData`/`updateData` channel (re-issuing it with old/new values), never mutate `data` directly. New-row creation from paste overflow is reported via a new `onCreateRows(partialRows: Partial<TData>[])` callback — the library never appends to `data` itself, matching `updateData`'s existing contract exactly.
- `sonner`'s `toast(...)` is called directly from `use-data-table.ts`/`data-table.tsx` (it's a global singleton, not React-context-bound) — no prop-drilling. Tests mock the `sonner` module (`vi.mock("sonner", () => ({ toast: vi.fn() }))`) rather than rendering real toasts, matching the architecture spec's own testing-strategy note ("undo/redo + toast calls (mock sonner)").
- **Scope decisions** (resolving ambiguity in the spec directly, per the standing "don't ask, use judgment" directive):
  1. **No dedicated "banner" component.** `docs/superpowers/specs/2026-07-11-datatable-architecture-design.md`'s row-gutter section lists "banner" as one of `row-gutter.tsx`'s responsibilities alongside row numbers/hover-checkbox/tri-state select-all — but Plan 3 (already shipped) implemented the other three with no elaboration anywhere in the spec on what a selection banner should contain (row count? bulk actions? which ones?). Inventing UI from a four-word mention with zero supporting detail is worse than omitting it; this plan does not add one.
  2. **Undo/redo is keyboard-only**, matching the spec's exact wording ("Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo") — no toolbar Undo/Redo buttons. The undo toast's own "Redo" action button (and the redo toast's symmetric "Undo" action button) is the spec's only mentioned UI affordance beyond the shortcuts themselves.
  3. **Copy/paste is keyboard-only** (Cmd/Ctrl+C / Cmd/Ctrl+V) — the spec never mentions toolbar buttons for these, only for CSV export ("a toolbar action exporting the current view").
  4. **"Bulk clear"** (mentioned only once, in the toast-copy list: "bulk clear") is interpreted as Delete/Backspace clearing every *editable* cell in the selected rows (or just the active cell if no rows are selected) to `undefined`, as one undo batch — the direct Sheets/Excel/Airtable analog, and the only reading consistent with needing its own "cells cleared" toast distinct from a single-cell edit.
  5. **Copy scope is "active cell, or every visible column of every selected row"** — not an arbitrary rectangular *range* selection. The spec's "the active cell or the selected rows/range" already treats row-selection as the range mechanism this codebase has (Plan 3 shipped row selection, not a drag-to-select cell range), so "range" here just means "the selected rows, all columns."
  6. **Paste applies to every column with a `fromClipboard` AND that is currently editable** at the target cell, silently skipping columns that are neither — matching the existing "read-only gate" principle (cells stay copyable but never edit-affected when not editable), applied per-cell across the pasted block rather than gating the whole paste on the start cell's own editability.
  7. **CSV export scope is "current view"** (respects sort/filter/visible-columns, via `table.getSortedRowModel()`/`getVisibleLeafColumns()`) with **no selection-scoping in R1** — the spec says export is "optionally scoped to the selection" but doesn't specify a UI for choosing scope, and Plan 3's footer-calc scope-switch precedent (hover a selection to change scope) doesn't obviously transfer to a one-shot export action. Selection-scoped export is left for a follow-up rather than guessing an interaction.

---

## File Structure

**Modify:**
- `components/data-table/types.ts` — extend `DataTableColumnMeta` (clipboard serializers) and `DataTableRuntime` (undo/redo/canUndo/canRedo).
- `components/data-table/define-columns.tsx` — populate the new `DataTableColumnMeta` clipboard fields from each field's `toClipboard`/`fromClipboard`.
- `components/data-table/use-data-table.ts` — wires the undo stack, copy/paste/bulk-clear, and the composed `handleKeyDown` that layers Cmd/Ctrl+Z/C/V/Delete on top of `use-grid-navigation.ts`'s existing handler.
- `components/data-table/data-table.tsx` — new `onCreateRows` prop threaded through; new "Export CSV" toolbar button.
- `components/data-table/index.ts` — barrel exports for all new public names.
- `registry.json` + rebuilt `public/r/*.json` — register the 3 new files, add the `sonner` npm dependency + `sonner` registryDependency to both `data-table` items.
- `app/(examples)/data-table-demo/data-table-client.tsx` — wire `onCreateRows`, mount `<Toaster />`, exercise the new features.
- `package.json` — add `sonner` dependency.

**Create:**
- `components/data-table/undo.ts` + test — pure history-stack module (`createUndoStack`).
- `components/data-table/clipboard.ts` + test — pure TSV (de)serialization + paste-planning (`parseTsv`, `gridToTsv`, `planPaste`).
- `components/data-table/export-csv.ts` + test — pure CSV serialization (`exportCsv`) + a thin `downloadCsv` DOM helper.
- `components/ui/sonner.tsx` — the standard shadcn `sonner` wrapper (`<Toaster />`, themed via `next-themes`, which is already a dependency).

---

## Task 0: Branch

- [ ] **Step 1: Create and check out the feature branch from `main`**

```bash
git checkout main
git pull origin main
git checkout -b feat/data-table-undo-clipboard
```

Expected: `main` is at commit `db4c287` or later (Plan 3's merge) before branching.

---

## Task 1: Core types + pure undo/redo history stack (`undo.ts`)

**Files:**
- Modify: `components/data-table/types.ts`
- Create: `components/data-table/undo.ts`
- Test: `components/data-table/undo.test.ts`

**Interfaces:**
- Produces: `CellEdit`, `UndoBatch`, `UndoStack`, `createUndoStack(maxSize?: number): UndoStack` — consumed by Task 3 (`use-data-table.ts`). Extended `DataTableColumnMeta` (`toClipboard`/`fromClipboard`) — consumed by Task 2. Extended `DataTableRuntime` (`undo`/`redo`/`canUndo`/`canRedo`) — consumed by Task 3, read by any custom UI a consumer builds.

- [ ] **Step 1: Write the failing test for `createUndoStack`**

Create `components/data-table/undo.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { createUndoStack, type CellEdit } from "./undo"

const EDIT_A: CellEdit = { rowId: "1", columnId: "name", prev: "Bailey", next: "Baily" }
const EDIT_B: CellEdit = { rowId: "2", columnId: "age", prev: 30, next: 31 }

describe("createUndoStack", () => {
  it("starts with nothing to undo or redo", () => {
    const stack = createUndoStack()
    expect(stack.canUndo()).toBe(false)
    expect(stack.canRedo()).toBe(false)
    expect(stack.undo()).toBeNull()
    expect(stack.redo()).toBeNull()
  })

  it("push then undo returns the pushed batch and enables redo", () => {
    const stack = createUndoStack()
    stack.push([EDIT_A])
    expect(stack.canUndo()).toBe(true)
    expect(stack.undo()).toEqual([EDIT_A])
    expect(stack.canUndo()).toBe(false)
    expect(stack.canRedo()).toBe(true)
  })

  it("redo returns the same batch that was undone", () => {
    const stack = createUndoStack()
    stack.push([EDIT_A])
    stack.undo()
    expect(stack.redo()).toEqual([EDIT_A])
    expect(stack.canRedo()).toBe(false)
    expect(stack.canUndo()).toBe(true)
  })

  it("undo/redo pop in LIFO order across multiple batches", () => {
    const stack = createUndoStack()
    stack.push([EDIT_A])
    stack.push([EDIT_B])
    expect(stack.undo()).toEqual([EDIT_B])
    expect(stack.undo()).toEqual([EDIT_A])
    expect(stack.undo()).toBeNull()
    expect(stack.redo()).toEqual([EDIT_A])
    expect(stack.redo()).toEqual([EDIT_B])
  })

  it("a new push after an undo clears the redo stack (branching history is discarded, not kept)", () => {
    const stack = createUndoStack()
    stack.push([EDIT_A])
    stack.undo()
    expect(stack.canRedo()).toBe(true)
    stack.push([EDIT_B])
    expect(stack.canRedo()).toBe(false)
    expect(stack.redo()).toBeNull()
  })

  it("pushing an empty batch is a no-op", () => {
    const stack = createUndoStack()
    stack.push([])
    expect(stack.canUndo()).toBe(false)
  })

  it("caps history at maxSize, dropping the oldest batch first", () => {
    const stack = createUndoStack(2)
    stack.push([{ rowId: "1", columnId: "a", prev: 0, next: 1 }])
    stack.push([{ rowId: "1", columnId: "a", prev: 1, next: 2 }])
    stack.push([{ rowId: "1", columnId: "a", prev: 2, next: 3 }])
    // Only the last 2 pushes survive — the first (0->1) was evicted.
    expect(stack.undo()).toEqual([{ rowId: "1", columnId: "a", prev: 2, next: 3 }])
    expect(stack.undo()).toEqual([{ rowId: "1", columnId: "a", prev: 1, next: 2 }])
    expect(stack.undo()).toBeNull()
  })

  it("clear() empties both the undo and redo stacks", () => {
    const stack = createUndoStack()
    stack.push([EDIT_A])
    stack.undo()
    stack.clear()
    expect(stack.canUndo()).toBe(false)
    expect(stack.canRedo()).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/undo.test.ts`
Expected: FAIL — `./undo` doesn't exist yet.

- [ ] **Step 3: Implement `undo.ts`**

Create `components/data-table/undo.ts`:

```ts
/** One cell's before/after value, as reported to the undo stack at the moment it changed. */
export type CellEdit = { rowId: string; columnId: string; prev: unknown; next: unknown }

/**
 * One or more CellEdits that undo/redo together atomically — a single edit
 * is a one-element batch; a paste or bulk-clear is a multi-element batch, so
 * one Ctrl+Z undoes the whole operation, not one cell at a time.
 */
export type UndoBatch = CellEdit[]

export type UndoStack = {
  /** Records a batch as the next undoable step. A new push always clears any pending redo — see the "branching history" test above. Empty batches are ignored. */
  push: (batch: UndoBatch) => void
  /** Pops and returns the most recent batch (the caller applies each edit's `prev`), or null if there's nothing to undo. */
  undo: () => UndoBatch | null
  /** Pops and returns the most recently undone batch (the caller applies each edit's `next`), or null if there's nothing to redo. */
  redo: () => UndoBatch | null
  canUndo: () => boolean
  canRedo: () => boolean
  /** Empties both stacks — not currently called by use-data-table.ts, but exposed for a future "data prop changed out from under us" reset, mirroring the isAllMatchingSelected reconciliation added in Plan 3. */
  clear: () => void
}

/**
 * Plain, React-free history stack. `maxSize` bounds memory on a long editing
 * session — the oldest batch is silently dropped once the cap is exceeded,
 * same convention as most spreadsheet undo stacks (no error, no toast; a
 * user editing 100+ cells in one session and going back further than that
 * is an extreme edge case, not a correctness concern worth surfacing).
 */
export function createUndoStack(maxSize = 100): UndoStack {
  let past: UndoBatch[] = []
  let future: UndoBatch[] = []

  return {
    push(batch) {
      if (batch.length === 0) return
      past.push(batch)
      if (past.length > maxSize) past.shift()
      future = []
    },
    undo() {
      const batch = past.pop()
      if (!batch) return null
      future.push(batch)
      return batch
    },
    redo() {
      const batch = future.pop()
      if (!batch) return null
      past.push(batch)
      return batch
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear() {
      past = []
      future = []
    },
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/undo.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Extend `types.ts`**

Open `components/data-table/types.ts`. Add `toClipboard`/`fromClipboard` to `DataTableColumnMeta`:

```ts
/** Per-column metadata stashed on ColumnDef.meta by defineColumns. */
export type DataTableColumnMeta = {
  /** Per-column editable override; undefined falls back to the table default. */
  editable?: boolean
  /** Plain-text label for UI that can't render the header function (e.g. the columns menu). */
  label: string
  /** Serializes a cell's value to clipboard/CSV text — populated from the column's FieldType.toClipboard by defineColumns. Falls back to String(value ?? "") when absent (raw ColumnDef escape-hatch columns). */
  toClipboard?: (value: unknown) => string
  /** Parses clipboard text back to a value; undefined means "couldn't parse, leave the cell alone" (paste skips it) — populated from FieldType.fromClipboard. Absent entirely (not just returning undefined) means the column can never be pasted into, e.g. a raw ColumnDef escape-hatch column with no clipboard support. */
  fromClipboard?: (text: string) => unknown
}
```

Add `undo`/`redo`/`canUndo`/`canRedo` to `DataTableRuntime` (append after the existing `toggleRowSelected` field):

```ts
  toggleRowSelected: (rowId: string, checked: boolean, shiftKey: boolean) => void
  /** Re-issues updateData with the most recent edit's PRIOR value(s) — a no-op if there's nothing to undo. Also used internally to undo a paste or bulk-clear batch as one step. */
  undo: () => void
  /** Re-applies the most recently undone edit's NEW value(s) — a no-op if there's nothing to redo. */
  redo: () => void
  /** Whether `undo()` currently does anything — for a consumer building custom undo UI; the shipped grid itself only exposes undo/redo via Cmd/Ctrl+Z keyboard shortcuts. */
  canUndo: boolean
  /** Whether `redo()` currently does anything. */
  canRedo: boolean
}
```

(The closing `}` above replaces the type's existing final `}` — this is the last field in the type.)

- [ ] **Step 6: Run the existing test suite to confirm the type changes don't break anything yet**

Run: `pnpm exec vitest run components/data-table/`
Expected: FAIL — every file constructing a full `DataTableRuntime` object literal (`types.test.ts`, `data-table-runtime-context.test.tsx`, `define-columns.test.tsx`, `row-gutter.test.tsx`, and the real `use-data-table.ts` itself) is now missing the 4 new required fields. This is expected and matches the pattern from Plan 3 Task 1 — fix each below.

- [ ] **Step 7: Add stub values to every file constructing a full `DataTableRuntime` literal**

In `components/data-table/types.test.ts`, add after the existing `setAllMatchingSelected: () => {},` line inside the literal:
```ts
      toggleRowSelected: () => {},
      undo: () => {},
      redo: () => {},
      canUndo: false,
      canRedo: false,
```

In `components/data-table/data-table-runtime-context.test.tsx`, add after `setAllMatchingSelected: () => {},` in `STUB_RUNTIME`:
```ts
  toggleRowSelected: () => {},
  undo: () => {},
  redo: () => {},
  canUndo: false,
  canRedo: false,
```

In `components/data-table/define-columns.test.tsx`, add after `setAllMatchingSelected: vi.fn(),` in `stubRuntime`'s returned object (before the `...overrides` spread):
```ts
    toggleRowSelected: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
```

In `components/data-table/row-gutter.test.tsx`, add the same 5 lines after `toggleRowSelected: vi.fn(),` in `stubRuntime` (before `...overrides`):
```ts
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
```

`components/data-table/use-data-table.ts` (the real, production hook) is fixed properly in Task 3, not stubbed — its `runtime` object literal will genuinely implement `undo`/`redo`/`canUndo`/`canRedo` there, so leave it failing typecheck for now (Task 3 fixes it for real).

- [ ] **Step 8: Run the test suite again, expect only `use-data-table.ts`'s real usage to still fail**

Run: `pnpm exec vitest run components/data-table/`
Expected: `use-data-table.test.tsx` FAILS (the real hook's `runtime` object is missing the 4 fields) — every other file passes. This is the expected, temporary state until Task 3.

Run: `pnpm typecheck`
Expected: FAIL, with errors only in `components/data-table/use-data-table.ts` about the `runtime` object literal missing `undo`/`redo`/`canUndo`/`canRedo`.

- [ ] **Step 9: Commit**

```bash
git add components/data-table/undo.ts components/data-table/undo.test.ts components/data-table/types.ts components/data-table/types.test.ts components/data-table/data-table-runtime-context.test.tsx components/data-table/define-columns.test.tsx components/data-table/row-gutter.test.tsx
git commit -m "feat(data-table): add core undo/redo + clipboard types and pure history stack

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(The real `use-data-table.ts` typecheck failure is expected to persist until Task 3 — this commit intentionally leaves the tree in a temporarily-broken-typecheck state for one task, exactly like Plan 3 Task 1 did for `DataTableRuntime`'s selection fields.)

**No deviations** — implementer matched the plan's given code verbatim; `types.ts`'s pre-existing shape and all 4 stub-target files' anchor lines matched exactly. Spec review traced `createUndoStack`'s push/undo/redo/eviction/branching-discard logic line-by-line against the actual code (not just running the tests) and independently confirmed the deferred `use-data-table.ts` typecheck failure is the ONLY one anywhere in the repo. Code-quality review found two real, small test-coverage gaps in `undo.test.ts` — the empty-batch-push test didn't verify it preserves an EXISTING redo stack (only that it doesn't create one from nothing), and no test exercised a multi-edit batch (the whole reason `UndoBatch` is an array, needed by Tasks 8/9's paste/bulk-clear) — both fixed directly with the exact tests the reviewer proposed. Full `undo.test.ts`: 10/10. Commit `d30f9ff` (amended).

---

## Task 2: Wire clipboard serializers into `defineColumns`

**Files:**
- Modify: `components/data-table/define-columns.tsx`
- Modify: `components/data-table/define-columns.test.tsx`

**Interfaces:**
- Consumes: `DataTableColumnMeta.toClipboard`/`.fromClipboard` (Task 1); every field's `FieldType.toClipboard`/`.fromClipboard` (already shipped, required on every field — `components/table-fields/types.ts`).
- Produces: every column built via `defineColumns` now carries working clipboard serializers in its `meta` — consumed by Tasks 5, 7, 8, 9 (clipboard/CSV).

- [ ] **Step 1: Write the failing test**

Add to `components/data-table/define-columns.test.tsx` (in the existing `describe("defineColumns / col builder", ...)` block — check the file first for its exact existing row/table fixtures and match their style):

```tsx
  it("col.text's meta carries the field's toClipboard/fromClipboard for TSV/CSV round-tripping", () => {
    const col = defineColumns<{ id: string; name: string }>()
    const column = col.text("name")
    const meta = column.meta as DataTableColumnMeta
    expect(meta.toClipboard?.("Bailey")).toBe("Bailey")
    expect(meta.fromClipboard?.("Bailey")).toBe("Bailey")
  })

  it("col.number's meta.fromClipboard parses numeric text and returns undefined for unparseable text", () => {
    const col = defineColumns<{ id: string; age: number }>()
    const column = col.number("age")
    const meta = column.meta as DataTableColumnMeta
    expect(meta.toClipboard?.(42)).toBe("42")
    expect(meta.fromClipboard?.("42")).toBe(42)
    expect(meta.fromClipboard?.("not a number")).toBeUndefined()
  })

  it("col.checkbox's meta round-trips true/false through clipboard text", () => {
    const col = defineColumns<{ id: string; done: boolean }>()
    const column = col.checkbox("done")
    const meta = column.meta as DataTableColumnMeta
    expect(meta.toClipboard?.(true)).toBe("true")
    expect(meta.fromClipboard?.("true")).toBe(true)
    expect(meta.fromClipboard?.("false")).toBe(false)
  })
```

Add `DataTableColumnMeta` to the file's existing `import type { ... } from "./types"` line if it isn't already imported (check first — `define-columns.tsx` itself already imports it, but the test file may not).

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/define-columns.test.tsx`
Expected: FAIL — `meta.toClipboard`/`meta.fromClipboard` are `undefined`, since `buildColumn` doesn't populate them yet.

- [ ] **Step 3: Wire it up in `define-columns.tsx`**

In `components/data-table/define-columns.tsx`, find `buildColumn`'s `meta` construction:

```ts
  const editable = field.edit ? opts.editable : false
  const meta: DataTableColumnMeta = { editable, label: labelFor(key, opts.header) }
```

Replace with:

```ts
  const editable = field.edit ? opts.editable : false
  const meta: DataTableColumnMeta = {
    editable,
    label: labelFor(key, opts.header),
    // `V` is erased at the ColumnDef<TData, unknown> boundary this function
    // returns into — the casts here are safe because toClipboard/fromClipboard
    // are always called with values that flowed through THIS SAME column
    // (either read via row.getValue(column.id), or about to be written back
    // via updateData for that same column), never a value from a different
    // column's V.
    toClipboard: field.toClipboard as (value: unknown) => string,
    fromClipboard: field.fromClipboard as (text: string) => unknown,
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/define-columns.test.tsx`
Expected: PASS (all tests, existing + the 3 new ones).

- [ ] **Step 5: Run the broader regression + lint + typecheck**

Run: `pnpm exec vitest run components/data-table/ components/table-fields/`
Expected: same single expected failure as Task 1 Step 8 (`use-data-table.test.tsx`, fixed in Task 3) — no new failures.

Run: `pnpm exec eslint components/data-table/define-columns.tsx components/data-table/define-columns.test.tsx`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add components/data-table/define-columns.tsx components/data-table/define-columns.test.tsx
git commit -m "feat(data-table): populate column meta clipboard serializers from FieldType

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**No deviations.** `buildColumn`'s existing shape matched the plan's snippet exactly. Spec review hand-verified all 3 new tests against the REAL underlying field implementations (`textField`/`numberField`/`checkboxField`), not just trusting the tests' own assertions — confirmed `col.number`'s `fromClipboard("not a number")` really returns `undefined` (not `NaN`/`0`) by reading `parseNumeric`'s actual empty-string guard. Code-quality review confirmed the type-erasure cast's justification is structurally sound (one fresh `meta` object per column, never shared/reassigned) rather than hand-wavy, and that `buildColumn`'s single shared code path (unconditional passthrough, no branching on field identity or `noAccessor`) makes the 3 tested field types sufficient coverage — a dedicated `col.button` test would exercise no additional logic. 172/172 regression, typecheck shows only the still-expected deferred `use-data-table.ts` failure, lint clean. Commit `8ce4433`.

---

## Task 3: Wire undo/redo into `useDataTable` + Cmd/Ctrl+Z keyboard handling

**Files:**
- Modify: `components/data-table/use-data-table.ts`
- Modify: `components/data-table/use-data-table.test.tsx`

**Interfaces:**
- Consumes: `createUndoStack` (Task 1).
- Produces: `DataTableRuntime.undo`/`.redo`/`.canUndo`/`.canRedo` (real implementations, replacing Task 1's temporary typecheck gap); a `commitBatch(ops: {rowId, columnId, value}[])` internal function (not on the public runtime — used by Tasks 8/9's paste/bulk-clear); a composed `handleKeyDown` on the runtime that layers Cmd/Ctrl+Z/Shift+Z on top of `nav.handleKeyDown`, extended further in Tasks 7/8.

- [ ] **Step 1: Write the failing tests**

Add to `components/data-table/use-data-table.test.tsx` (a new `describe` block near the end of the file, after the existing `"useDataTable — row selection"` block):

```tsx
describe("useDataTable — undo/redo", () => {
  it("updateData pushes an undo batch capturing the cell's prior value", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id }),
    )
    expect(result.current.runtime.canUndo).toBe(false)
    act(() => result.current.runtime.updateData("1", "name", "Baily"))
    expect(result.current.runtime.canUndo).toBe(true)
  })

  it("undo() re-issues onUpdateData with the prior value and enables redo", () => {
    const onUpdateData = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id, onUpdateData }),
    )
    act(() => result.current.runtime.updateData("1", "name", "Baily"))
    onUpdateData.mockClear()
    act(() => result.current.runtime.undo())
    expect(onUpdateData).toHaveBeenCalledWith("1", "name", "Bailey") // DATA's original value
    expect(result.current.runtime.canUndo).toBe(false)
    expect(result.current.runtime.canRedo).toBe(true)
  })

  it("redo() re-issues onUpdateData with the new value", () => {
    const onUpdateData = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id, onUpdateData }),
    )
    act(() => result.current.runtime.updateData("1", "name", "Baily"))
    act(() => result.current.runtime.undo())
    onUpdateData.mockClear()
    act(() => result.current.runtime.redo())
    expect(onUpdateData).toHaveBeenCalledWith("1", "name", "Baily")
    expect(result.current.runtime.canRedo).toBe(false)
  })

  it("undo() with nothing to undo does not call onUpdateData", () => {
    const onUpdateData = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id, onUpdateData }),
    )
    act(() => result.current.runtime.undo())
    expect(onUpdateData).not.toHaveBeenCalled()
  })

  it("Ctrl+Z triggers undo via handleKeyDown", () => {
    const onUpdateData = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id, onUpdateData }),
    )
    act(() => result.current.runtime.updateData("1", "name", "Baily"))
    onUpdateData.mockClear()
    const preventDefault = vi.fn()
    act(() =>
      result.current.runtime.handleKeyDown({
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        preventDefault,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )
    expect(preventDefault).toHaveBeenCalled()
    expect(onUpdateData).toHaveBeenCalledWith("1", "name", "Bailey")
  })

  it("Ctrl+Shift+Z triggers redo via handleKeyDown", () => {
    const onUpdateData = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id, onUpdateData }),
    )
    act(() => result.current.runtime.updateData("1", "name", "Baily"))
    act(() => result.current.runtime.undo())
    onUpdateData.mockClear()
    const preventDefault = vi.fn()
    act(() =>
      result.current.runtime.handleKeyDown({
        key: "Z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
        preventDefault,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )
    expect(onUpdateData).toHaveBeenCalledWith("1", "name", "Baily")
  })

  it("a non-undo/redo key still falls through to grid navigation (arrow keys still move the active cell)", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id }),
    )
    act(() => result.current.runtime.setActiveCell({ rowId: "1", columnId: "name" }))
    act(() =>
      result.current.runtime.handleKeyDown({
        key: "ArrowDown",
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )
    expect(result.current.runtime.activeCell).toEqual({ rowId: "2", columnId: "name" })
  })
})
```

Before pasting this in, open `components/data-table/use-data-table.test.tsx` and confirm the actual current `Row`/`DATA` fixture shape at the top of the file (established from earlier tasks — `Row = { id: string; name: string; age: number }`, `DATA = [{ id: "1", name: "Bailey", age: 44 }, { id: "2", name: "Ada", age: 30 }]`) and adapt the assertions above if it has since diverged.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx`
Expected: FAIL — `runtime.undo`/`redo`/`canUndo`/`canRedo` don't exist yet (this is the same failure carried over from Task 1).

- [ ] **Step 3: Implement in `use-data-table.ts`**

Add the import at the top of `components/data-table/use-data-table.ts`:

```ts
import { createUndoStack, type CellEdit } from "./undo"
```

After the existing `toggleRowSelected` callback (added in Plan 3) and before the `const rows = table.getRowModel().rows` line, add:

```ts
  // Plain history stack in a ref (not React state) — its own internal
  // past/future arrays are mutated directly by push/undo/redo, so a ref
  // avoids re-render-triggered staleness entirely. canUndo/canRedo ARE
  // separate React state, re-synced after every stack mutation, purely so
  // consumers (and this file's own composed handleKeyDown) can read them
  // reactively without polling the stack's own canUndo()/canRedo() methods
  // on every render.
  const undoStackRef = React.useRef(createUndoStack())
  const [canUndo, setCanUndo] = React.useState(false)
  const [canRedo, setCanRedo] = React.useState(false)
  const syncUndoState = React.useCallback(() => {
    setCanUndo(undoStackRef.current.canUndo())
    setCanRedo(undoStackRef.current.canRedo())
  }, [])

  // Applies a batch of cell writes as ONE undo step (a paste or bulk-clear),
  // vs. `updateData` below which is always a one-cell batch. Reads each
  // cell's CURRENT value via table.getRow BEFORE calling onUpdateData for
  // any of them, so undo restores every cell to what it held right before
  // this batch, not to some value produced by an earlier cell in the same
  // batch (relevant if two ops in one batch happen to target the same cell,
  // e.g. a degenerate paste — the FIRST one's prev is captured, matching
  // "undo restores pre-batch state" rather than "undo replays intermediate
  // states backwards").
  const commitBatch = React.useCallback(
    (ops: { rowId: string; columnId: string; value: unknown }[]) => {
      if (ops.length === 0) return
      const seen = new Set<string>()
      const batch: CellEdit[] = []
      for (const op of ops) {
        const key = `${op.rowId}:${op.columnId}`
        if (seen.has(key)) continue
        seen.add(key)
        batch.push({
          rowId: op.rowId,
          columnId: op.columnId,
          prev: table.getRow(op.rowId)?.getValue(op.columnId),
          next: op.value,
        })
      }
      undoStackRef.current.push(batch)
      syncUndoState()
      for (const op of ops) onUpdateData?.(op.rowId, op.columnId, op.value)
    },
    [onUpdateData, table, syncUndoState],
  )

  const undo = React.useCallback(() => {
    const batch = undoStackRef.current.undo()
    if (!batch) return
    syncUndoState()
    for (const edit of batch) onUpdateData?.(edit.rowId, edit.columnId, edit.prev)
  }, [onUpdateData, syncUndoState])

  const redo = React.useCallback(() => {
    const batch = undoStackRef.current.redo()
    if (!batch) return
    syncUndoState()
    for (const edit of batch) onUpdateData?.(edit.rowId, edit.columnId, edit.next)
  }, [onUpdateData, syncUndoState])
```

Now find the EXISTING `updateData` callback near the bottom of the file:

```ts
  const updateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      onUpdateData?.(rowId, columnId, value)
    },
    [onUpdateData],
  )
```

Replace it with a version that goes through `commitBatch` (a single-cell batch is exactly what "one edit = one undo step" means, so `updateData` becomes a one-line wrapper — no behavior change for callers, but now undoable):

```ts
  const updateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      commitBatch([{ rowId, columnId, value }])
    },
    [commitBatch],
  )
```

Now find the runtime object's construction:

```ts
  const runtime: DataTableRuntime = {
    ...nav,
    isColumnEditable,
    updateData,
    manualPagination,
    totalRowCount,
    isAllMatchingSelected,
    setAllMatchingSelected,
    toggleRowSelected,
  }
```

Replace with (adding the undo/redo fields, and OVERRIDING `handleKeyDown` from the `...nav` spread with a composed version — object literal key order means the later `handleKeyDown` wins):

```ts
  // Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z first; everything else falls through to
  // grid navigation's own handler unchanged. Deliberately layered here
  // rather than inside use-grid-navigation.ts — that hook's own module doc
  // comment scopes it to "pure grid navigation... no undo/clipboard
  // concerns" (Plan 2), and undo genuinely needs this file's table/onUpdateData
  // access that hook doesn't have. Tasks 7/8 extend this same function with
  // Cmd/Ctrl+C/V and Delete/Backspace — see their Step 3s.
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      nav.handleKeyDown(e)
    },
    [nav, undo, redo],
  )

  const runtime: DataTableRuntime = {
    ...nav,
    isColumnEditable,
    updateData,
    manualPagination,
    totalRowCount,
    isAllMatchingSelected,
    setAllMatchingSelected,
    toggleRowSelected,
    undo,
    redo,
    canUndo,
    canRedo,
    handleKeyDown,
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx`
Expected: PASS (all tests, existing + the 7 new ones).

- [ ] **Step 5: Run the broader regression + lint + typecheck**

Run: `pnpm exec vitest run components/data-table/ components/table-fields/`
Expected: 100% pass — this is the task that resolves Task 1's carried-over `use-data-table.test.tsx` failure.

Run: `pnpm typecheck && pnpm exec eslint components/data-table/use-data-table.ts components/data-table/use-data-table.test.tsx`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add components/data-table/use-data-table.ts components/data-table/use-data-table.test.tsx
git commit -m "feat(data-table): wire undo/redo history stack + Ctrl+Z/Shift+Z into useDataTable

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**No deviations** — the actual `use-data-table.ts` matched the plan's assumed shape exactly (existing `toggleRowSelected`/`updateData` callbacks, runtime construction). Spec review hand-traced the duplicate-target dedup scenario (`{rowId:"1",columnId:"name"}` targeted twice with different values in one `commitBatch` call) and confirmed `undo()` correctly restores pre-batch state; typecheck genuinely resolved (verified clean before/after). Code-quality review then found a real, if currently dormant, gap in that same dedup logic: `next` was frozen to the FIRST duplicate's value even though the un-deduped apply loop still calls `onUpdateData` for every op, so the cell's real final value is whatever the LAST duplicate set — meaning `redo()` on such a batch would have restored the wrong (first, not last) value. Fixed directly (now updates `next` on each later duplicate while still keeping the first `prev`), matching the reviewer's exact suggested fix. **This logic remains untested via any real caller and likely will stay that way**: traced forward through Task 8's planned `paste`/`clearSelectedOrActiveCells` — `planPaste` maps each parsed-grid cell to a unique row-index × column-index pair, and bulk-clear maps each already-deduplicated selected-row × editable-column pair, so NEITHER of this plan's real callers can ever produce a duplicate `{rowId, columnId}` target in one batch. The dedup path is defensive code for a caller that doesn't currently exist, verified correct by hand-tracing and independent review rather than by an integration test — a future feature that DOES produce duplicate targets should add a dedicated test at that point, since `commitBatch` isn't on the public `DataTableRuntime` surface for a plan-level test to reach directly. Full suite: 179/179 (unchanged — no new caller to add tests against), typecheck clean, lint clean. Commit `b8ecd79` (amended).

---

## Task 4: sonner dependency + Toaster + undo/redo toasts

**Files:**
- Modify: `package.json`
- Create: `components/ui/sonner.tsx`
- Modify: `components/data-table/use-data-table.ts`
- Modify: `components/data-table/use-data-table.test.tsx`

**Interfaces:**
- Produces: `<Toaster />` (re-exported from `components/ui/sonner.tsx`, the standard shadcn wrapper) — a consumer mounts this once at their app root, documented in Task 12's demo wiring. `undo()`/`redo()` now also call `toast(...)`.

- [ ] **Step 1: Add the `sonner` dependency**

Run:
```bash
pnpm add sonner
```

Expected: `package.json`'s `dependencies` gains a `"sonner"` entry; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Add the shadcn `sonner` UI primitive**

Create `components/ui/sonner.tsx` (the standard shadcn registry `sonner` component — verify this exact shape against the live shadcn registry via Context7 or `gh api repos/shadcn-ui/ui/contents/apps/v4/registry/new-york-v4/ui/sonner.tsx` before writing, per this repo's established practice of confirming shared `components/ui/*` shapes against upstream rather than guessing, same as Plan 3 Task 6's `TableFooter`):

```tsx
"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
```

If the live upstream shape differs from this (e.g. a newer shadcn revision), use the real upstream content instead — this snippet is the last-verified shape as of writing, not a guarantee it's still byte-exact.

- [ ] **Step 3: Write the failing test for undo/redo toasts**

Add to `components/data-table/use-data-table.test.tsx`, near the top of the file, a mock of the `sonner` module (Vitest mocks must be declared at module scope, before any `describe`/`it`):

```tsx
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn() }) }))

import { toast } from "sonner"
```

Add these two tests inside the existing `describe("useDataTable — undo/redo", ...)` block:

```tsx
  it("undo() shows a toast with a Redo action", () => {
    const mockToast = vi.mocked(toast)
    mockToast.mockClear()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id }),
    )
    act(() => result.current.runtime.updateData("1", "name", "Baily"))
    mockToast.mockClear()
    act(() => result.current.runtime.undo())
    expect(mockToast).toHaveBeenCalledWith(
      "Change undone",
      expect.objectContaining({ action: expect.objectContaining({ label: "Redo" }) }),
    )
  })

  it("redo() shows a toast with an Undo action", () => {
    const mockToast = vi.mocked(toast)
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id }),
    )
    act(() => result.current.runtime.updateData("1", "name", "Baily"))
    act(() => result.current.runtime.undo())
    mockToast.mockClear()
    act(() => result.current.runtime.redo())
    expect(mockToast).toHaveBeenCalledWith(
      "Change redone",
      expect.objectContaining({ action: expect.objectContaining({ label: "Undo" }) }),
    )
  })

  it("undo() with nothing to undo does not toast", () => {
    const mockToast = vi.mocked(toast)
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id }),
    )
    mockToast.mockClear()
    act(() => result.current.runtime.undo())
    expect(mockToast).not.toHaveBeenCalled()
  })
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx`
Expected: FAIL — `undo`/`redo` don't call `toast` yet.

- [ ] **Step 5: Wire toasts into `undo`/`redo`**

In `components/data-table/use-data-table.ts`, add the import:

```ts
import { toast } from "sonner"
```

Replace the `undo`/`redo` callbacks with versions that also toast:

```ts
  const undo = React.useCallback(() => {
    const batch = undoStackRef.current.undo()
    if (!batch) return
    syncUndoState()
    for (const edit of batch) onUpdateData?.(edit.rowId, edit.columnId, edit.prev)
    toast("Change undone", { action: { label: "Redo", onClick: () => redoRef.current() } })
  }, [onUpdateData, syncUndoState])

  const redo = React.useCallback(() => {
    const batch = undoStackRef.current.redo()
    if (!batch) return
    syncUndoState()
    for (const edit of batch) onUpdateData?.(edit.rowId, edit.columnId, edit.next)
    toast("Change redone", { action: { label: "Undo", onClick: () => undoRef.current() } })
  }, [onUpdateData, syncUndoState])
```

These reference `redoRef`/`undoRef` — a small forward-reference problem (the undo toast's Redo button needs to call `redo`, but `redo` is declared after `undo`, and `redo`'s Undo button needs `undo` right back). Resolve it with two refs updated after both callbacks exist. Add right after both `useCallback`s above:

```ts
  const undoRef = React.useRef(undo)
  const redoRef = React.useRef(redo)
  undoRef.current = undo
  redoRef.current = redo
```

(This assignment runs on every render, which is intentional and cheap — a plain ref write, not a `useEffect` — so the toast buttons always call the LATEST `undo`/`redo` closures even if a toast from an earlier render is still on screen when clicked.)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx`
Expected: PASS (all tests, existing + the 3 new toast tests).

- [ ] **Step 7: Run the broader regression + lint + typecheck**

Run: `pnpm exec vitest run components/data-table/ components/table-fields/`
Expected: 100% pass.

Run: `pnpm typecheck && pnpm exec eslint components/data-table/use-data-table.ts components/data-table/use-data-table.test.tsx components/ui/sonner.tsx`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml components/ui/sonner.tsx components/data-table/use-data-table.ts components/data-table/use-data-table.test.tsx
git commit -m "feat(data-table): add sonner Toaster + undo/redo toast notifications

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**One real deviation, explicitly sanctioned by this task's own instructions:** the plan's `components/ui/sonner.tsx` snippet was the icon-less shape last verified when this plan was written; the implementer fetched the live upstream shadcn registry source and found it had since gained a `lucide-react` icons map (success/info/warning/error/loading) and a `--border-radius` CSS var — used the real upstream content instead, per this task's own "if the live upstream shape differs... use the real upstream content instead" instruction. Spec review independently re-fetched the same upstream source and confirmed the committed file is byte-for-byte faithful (plus one necessary, minimal addition: `import type * as React from "react"`, required because this repo's tsconfig has no ambient React types). Code-quality review found a real gap: the 3 new toast tests asserted only the toast's call ARGUMENTS (message text, action label) but never invoked the action button's `onClick` — meaning the `undoRef`/`redoRef` forward-reference indirection (the specific mechanism this task added to prevent a stale/swapped-closure bug) had no test actually exercising it; a copy-paste swap (e.g. wiring undo's Redo button to `undoRef.current()` instead of `redoRef.current()`) would have passed every existing test AND typechecked cleanly. Fixed by extending both tests to invoke the captured `onClick` for real and assert the resulting `onUpdateData` call proves the RIGHT direction fired. Full suite: 182/182, typecheck/lint clean. Commit `17b3f3d` (amended).

---

## Task 5: Pure `clipboard.ts` — TSV (de)serialization + paste planning

**Files:**
- Create: `components/data-table/clipboard.ts`
- Test: `components/data-table/clipboard.test.ts`

**Interfaces:**
- Produces: `parseTsv(text: string): string[][]`, `gridToTsv(grid: unknown[][], columns: ClipboardColumn[]): string`, `planPaste<TData>(...): PastePlan<TData>`, `ClipboardColumn`, `PastePlan<TData>` — consumed by Tasks 7 (copy) and 8 (paste).

- [ ] **Step 1: Write the failing tests**

Create `components/data-table/clipboard.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { gridToTsv, parseTsv, planPaste, type ClipboardColumn } from "./clipboard"

describe("parseTsv", () => {
  it("splits rows on newlines and cells on tabs", () => {
    expect(parseTsv("a\tb\nc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })

  it("normalizes \\r\\n and bare \\r line endings", () => {
    expect(parseTsv("a\tb\r\nc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
    expect(parseTsv("a\tb\rc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })

  it("a single cell (no tabs or newlines) parses as one row of one cell", () => {
    expect(parseTsv("hello")).toEqual([["hello"]])
  })

  it("drops exactly one trailing empty line (common when copying from a spreadsheet), but keeps interior blank lines", () => {
    expect(parseTsv("a\tb\nc\td\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
    expect(parseTsv("a\n\nb")).toEqual([["a"], [""], ["b"]])
  })
})

describe("gridToTsv", () => {
  const columns: ClipboardColumn[] = [
    { id: "name", toClipboard: (v) => String(v ?? "") },
    { id: "age", toClipboard: (v) => String(v ?? "") },
  ]

  it("joins cells with tabs and rows with newlines, running each value through its column's toClipboard", () => {
    const grid = [
      ["Bailey", 44],
      ["Ada", 30],
    ]
    expect(gridToTsv(grid, columns)).toBe("Bailey\t44\nAda\t30")
  })

  it("a single value (1x1 grid) serializes with no tabs or newlines", () => {
    expect(gridToTsv([["Bailey"]], [columns[0]])).toBe("Bailey")
  })
})

describe("planPaste", () => {
  const columns: ClipboardColumn[] = [
    { id: "name", toClipboard: (v) => String(v ?? ""), fromClipboard: (t) => t },
    {
      id: "age",
      toClipboard: (v) => String(v ?? ""),
      fromClipboard: (t) => {
        const n = Number(t)
        return Number.isFinite(n) ? n : undefined
      },
    },
  ]
  const rowIds = ["r1", "r2"]

  it("maps a parsed grid onto existing rows starting at the given position", () => {
    const plan = planPaste(
      [
        ["Baily", "45"],
        ["Adah", "31"],
      ],
      0,
      0,
      rowIds,
      columns,
    )
    expect(plan.updates).toEqual([
      { rowId: "r1", columnId: "name", value: "Baily" },
      { rowId: "r1", columnId: "age", value: 45 },
      { rowId: "r2", columnId: "name", value: "Adah" },
      { rowId: "r2", columnId: "age", value: 31 },
    ])
    expect(plan.newRows).toEqual([])
  })

  it("pastes starting at a non-zero column offset, only touching columns from there on", () => {
    const plan = planPaste([["45"]], 0, 1, rowIds, columns)
    expect(plan.updates).toEqual([{ rowId: "r1", columnId: "age", value: 45 }])
  })

  it("skips a cell whose column has no fromClipboard (read-only/unsupported column)", () => {
    const readOnlyColumns: ClipboardColumn[] = [
      { id: "name", toClipboard: (v) => String(v ?? "") }, // no fromClipboard
      columns[1],
    ]
    const plan = planPaste([["Baily", "45"]], 0, 0, rowIds, readOnlyColumns)
    expect(plan.updates).toEqual([{ rowId: "r1", columnId: "age", value: 45 }])
  })

  it("skips a cell whose text fails to parse (fromClipboard returns undefined), leaving that cell untouched", () => {
    const plan = planPaste([["Baily", "not a number"]], 0, 0, rowIds, columns)
    expect(plan.updates).toEqual([{ rowId: "r1", columnId: "name", value: "Baily" }])
  })

  it("rows past the end of rowIds are reported as newRows instead of updates", () => {
    const plan = planPaste(
      [
        ["Baily", "45"],
        ["Adah", "31"],
        ["Chris", "22"],
      ],
      0,
      0,
      rowIds, // only 2 existing rows
      columns,
    )
    expect(plan.updates).toEqual([
      { rowId: "r1", columnId: "name", value: "Baily" },
      { rowId: "r1", columnId: "age", value: 45 },
      { rowId: "r2", columnId: "name", value: "Adah" },
      { rowId: "r2", columnId: "age", value: 31 },
    ])
    expect(plan.newRows).toEqual([{ name: "Chris", age: 22 }])
  })

  it("a new row with every cell unparseable is not reported at all (an empty partial row is not useful)", () => {
    const plan = planPaste([["not a number"]], 0, 1, rowIds.slice(0, 0), columns) // no existing rows, only the "age" column, unparseable text
    expect(plan.newRows).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/data-table/clipboard.test.ts`
Expected: FAIL — `./clipboard` doesn't exist yet.

- [ ] **Step 3: Implement `clipboard.ts`**

Create `components/data-table/clipboard.ts`:

```ts
/** A column's clipboard serialize/parse pair, as read off DataTableColumnMeta by the React-level copy/paste glue in use-data-table.ts. */
export type ClipboardColumn = {
  id: string
  toClipboard: (value: unknown) => string
  /** Absent (not just returning undefined) means this column can never be pasted into. */
  fromClipboard?: (text: string) => unknown
}

/**
 * Parses TSV text (as read from the clipboard) into a 2D grid of raw cell
 * strings. Normalizes \r\n and bare \r line endings to \n before splitting.
 * Drops exactly one trailing empty line — pasting from Excel/Sheets always
 * ends the copied block with a line terminator, which would otherwise show
 * up as one extra, entirely-empty row here.
 */
export function parseTsv(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop()
  return lines.map((line) => line.split("\t"))
}

/**
 * Serializes a rectangular grid of raw values into Excel/Sheets-pasteable
 * TSV, running each value through its column's toClipboard. `columns` must
 * be in the same left-to-right order as `grid`'s inner arrays.
 */
export function gridToTsv(grid: unknown[][], columns: ClipboardColumn[]): string {
  return grid
    .map((row) => row.map((value, i) => columns[i]?.toClipboard(value) ?? "").join("\t"))
    .join("\n")
}

export type PastePlan<TData> = {
  /** Writes to existing rows — hand to DataTableRuntime's internal commitBatch. */
  updates: { rowId: string; columnId: string; value: unknown }[]
  /** Rows the pasted block extends past the last existing row — hand to onCreateRows. */
  newRows: Partial<TData>[]
}

/**
 * Maps a parsed TSV grid onto the table starting at (startRowIndex,
 * startColIndex) in on-screen row/column order. A cell is skipped (neither
 * an update nor part of a new row) when its target column has no
 * fromClipboard at all, or when fromClipboard returns undefined for that
 * cell's text (unparseable) — "skip, don't apply" matches the read-only
 * gate's existing "cells stay copyable but never edit-affected when not
 * editable" principle, applied per-cell across the pasted block.
 */
export function planPaste<TData>(
  parsedGrid: string[][],
  startRowIndex: number,
  startColIndex: number,
  rowIds: string[],
  columns: ClipboardColumn[],
): PastePlan<TData> {
  const updates: PastePlan<TData>["updates"] = []
  const newRows: Partial<TData>[] = []

  parsedGrid.forEach((line, rOffset) => {
    const rowIndex = startRowIndex + rOffset
    const rowId: string | undefined = rowIds[rowIndex]
    const partial: Record<string, unknown> = {}
    let hasAny = false

    line.forEach((cellText, cOffset) => {
      const column = columns[startColIndex + cOffset]
      if (!column?.fromClipboard) return
      const value = column.fromClipboard(cellText)
      if (value === undefined) return
      if (rowId) {
        updates.push({ rowId, columnId: column.id, value })
      } else {
        partial[column.id] = value
        hasAny = true
      }
    })

    if (!rowId && hasAny) newRows.push(partial as Partial<TData>)
  })

  return { updates, newRows }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/data-table/clipboard.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Lint + typecheck**

Run: `pnpm exec eslint components/data-table/clipboard.ts components/data-table/clipboard.test.ts && pnpm typecheck`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add components/data-table/clipboard.ts components/data-table/clipboard.test.ts
git commit -m "feat(data-table): add pure clipboard.ts (TSV parse/serialize + paste planning)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Pure `export-csv.ts`

**Files:**
- Create: `components/data-table/export-csv.ts`
- Test: `components/data-table/export-csv.test.ts`

**Interfaces:**
- Produces: `exportCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string`, `downloadCsv(filename: string, csv: string): void`, `CsvColumn` — consumed by Task 9 (the toolbar Export CSV button in `data-table.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `components/data-table/export-csv.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { exportCsv, type CsvColumn } from "./export-csv"

const COLUMNS: CsvColumn[] = [
  { id: "name", label: "Name", toClipboard: (v) => String(v ?? "") },
  { id: "age", label: "Age", toClipboard: (v) => String(v ?? "") },
]

describe("exportCsv", () => {
  it("produces a header row from column labels, then one row per record, CRLF-joined", () => {
    const csv = exportCsv(
      [
        { name: "Bailey", age: 44 },
        { name: "Ada", age: 30 },
      ],
      COLUMNS,
    )
    expect(csv).toBe("Name,Age\r\nBailey,44\r\nAda,30")
  })

  it("an empty rows array produces just the header row", () => {
    expect(exportCsv([], COLUMNS)).toBe("Name,Age")
  })

  it("quotes a field containing a comma", () => {
    const csv = exportCsv([{ name: "Smith, Bailey", age: 44 }], COLUMNS)
    expect(csv).toBe('Name,Age\r\n"Smith, Bailey",44')
  })

  it("quotes a field containing a double quote, doubling the internal quote (RFC 4180)", () => {
    const csv = exportCsv([{ name: 'Bailey "The Kid"', age: 44 }], COLUMNS)
    expect(csv).toBe('Name,Age\r\n"Bailey ""The Kid""",44')
  })

  it("quotes a field containing a newline", () => {
    const csv = exportCsv([{ name: "Bailey\nJr", age: 44 }], COLUMNS)
    expect(csv).toBe('Name,Age\r\n"Bailey\nJr",44')
  })

  it("a missing value for a column serializes via toClipboard(undefined), typically an empty string", () => {
    const csv = exportCsv([{ name: "Bailey" }], COLUMNS) // no "age" key at all
    expect(csv).toBe("Name,Age\r\nBailey,")
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/data-table/export-csv.test.ts`
Expected: FAIL — `./export-csv` doesn't exist yet.

- [ ] **Step 3: Implement `export-csv.ts`**

Create `components/data-table/export-csv.ts`:

```ts
/** A column's export label + serializer, as read off DataTableColumnMeta by the React-level export glue in data-table.tsx. */
export type CsvColumn = { id: string; label: string; toClipboard: (value: unknown) => string }

// RFC 4180: quote a field if it contains the delimiter, a quote, or a line
// break; a literal quote inside a quoted field is escaped by doubling it.
function escapeCsvField(field: string): string {
  if (/[",\n\r]/.test(field)) return `"${field.replace(/"/g, '""')}"`
  return field
}

/**
 * Builds a CSV string (CRLF line endings, RFC 4180 quoting) from plain
 * row-value records, running each value through its column's toClipboard —
 * the same formatting copy/paste uses, so an exported number/currency/date
 * cell reads the same as what a user would see if they copied it.
 */
export function exportCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const header = columns.map((c) => escapeCsvField(c.label))
  const body = rows.map((row) => columns.map((c) => escapeCsvField(c.toClipboard(row[c.id]))))
  return [header, ...body].map((line) => line.join(",")).join("\r\n")
}

/**
 * Triggers a browser file download of `csv` as `filename` via a throwaway
 * object URL + anchor click. Pure DOM plumbing, not unit-tested the same way
 * as exportCsv above (jsdom has no real download pipeline to assert
 * against) — verified in Task 9's manual browser check instead.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/data-table/export-csv.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Lint + typecheck**

Run: `pnpm exec eslint components/data-table/export-csv.ts components/data-table/export-csv.test.ts && pnpm typecheck`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add components/data-table/export-csv.ts components/data-table/export-csv.test.ts
git commit -m "feat(data-table): add pure export-csv.ts (RFC 4180 CSV serialization)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Wire Copy (Cmd/Ctrl+C) into `useDataTable`

**Files:**
- Modify: `components/data-table/use-data-table.ts`
- Modify: `components/data-table/use-data-table.test.tsx`

**Interfaces:**
- Consumes: `gridToTsv` (Task 5).
- Produces: `handleKeyDown` now also handles Cmd/Ctrl+C, copying to `navigator.clipboard`.

- [ ] **Step 1: Write the failing tests**

Add to `components/data-table/use-data-table.test.tsx`, in a new `describe("useDataTable — copy", ...)` block. Since `navigator.clipboard` isn't implemented by jsdom, stub it first — add this near the top of the file, alongside the existing `vi.mock("sonner", ...)`:

```tsx
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: vi.fn().mockResolvedValue(undefined), readText: vi.fn().mockResolvedValue("") },
  configurable: true,
  writable: true,
})
```

```tsx
describe("useDataTable — copy", () => {
  it("Ctrl+C with an active cell and no row selection copies just that cell's value", async () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id }),
    )
    act(() => result.current.runtime.setActiveCell({ rowId: "1", columnId: "name" }))
    await act(async () =>
      result.current.runtime.handleKeyDown({
        key: "c",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Bailey")
  })

  it("Ctrl+C with rows selected copies every visible column of every selected row as TSV", async () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name"), col.number("age")],
        getRowId: (r) => r.id,
        enableRowSelection: true,
      }),
    )
    act(() => result.current.runtime.toggleRowSelected("1", true, false))
    act(() => result.current.runtime.toggleRowSelected("2", true, true))
    await act(async () =>
      result.current.runtime.handleKeyDown({
        key: "c",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Bailey\t44\nAda\t30")
  })

  it("Ctrl+C with no active cell and no selection does nothing", async () => {
    const mockWriteText = vi.mocked(navigator.clipboard.writeText)
    mockWriteText.mockClear()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id }),
    )
    await act(async () =>
      result.current.runtime.handleKeyDown({
        key: "c",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )
    expect(mockWriteText).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx`
Expected: FAIL — Ctrl+C currently falls through to `nav.handleKeyDown`, which does nothing with `"c"`.

- [ ] **Step 3: Wire it up**

In `components/data-table/use-data-table.ts`, add the import:

```ts
import { gridToTsv } from "./clipboard"
import type { DataTableColumnMeta } from "./types"
```

(`DataTableColumnMeta` may already be imported on the file's existing `import type { DataTableColumnMeta, DataTableRuntime } from "./types"` line — if so, don't add a duplicate import; just confirm it's already there.)

Add a `copy` callback, placed right AFTER the existing `const nav = useGridNavigation({ rowIds, columnIds, isColumnEditable })` line — it needs both `columnIds` and `nav.activeCell`, and `nav` is the later of the two to become available:

```ts
  const copy = React.useCallback(async () => {
    const selectedRows = table.getSelectedRowModel().rows
    const clipboardColumns = (ids: string[]) =>
      ids.map((id) => {
        const meta = table.getColumn(id)?.columnDef.meta as DataTableColumnMeta | undefined
        return { id, toClipboard: meta?.toClipboard ?? ((v: unknown) => String(v ?? "")) }
      })

    let grid: unknown[][]
    let cols: ReturnType<typeof clipboardColumns>

    if (selectedRows.length > 0) {
      grid = selectedRows.map((row) => columnIds.map((id) => row.getValue(id)))
      cols = clipboardColumns(columnIds)
    } else {
      const active = nav.activeCell
      if (!active) return
      const row = table.getRow(active.rowId)
      grid = [[row.getValue(active.columnId)]]
      cols = clipboardColumns([active.columnId])
    }

    await navigator.clipboard.writeText(gridToTsv(grid, cols))
  }, [table, columnIds, nav.activeCell])
```

Now extend `handleKeyDown` to check for Cmd/Ctrl+C before falling through:

```ts
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === "c" && !nav.editingCell) {
        e.preventDefault()
        void copy()
        return
      }
      nav.handleKeyDown(e)
    },
    [nav, undo, redo, copy],
  )
```

(The `!nav.editingCell` guard matters: while actively typing in a text field mid-edit, Ctrl+C should copy the SELECTED TEXT inside that input via the browser's own native behavior, not the grid's cell-copy — intercepting it here would break normal text copy while editing.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx`
Expected: PASS (all tests, existing + the 3 new copy tests).

- [ ] **Step 5: Run the broader regression + lint + typecheck**

Run: `pnpm exec vitest run components/data-table/ components/table-fields/`
Expected: 100% pass.

Run: `pnpm typecheck && pnpm exec eslint components/data-table/use-data-table.ts components/data-table/use-data-table.test.tsx`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add components/data-table/use-data-table.ts components/data-table/use-data-table.test.tsx
git commit -m "feat(data-table): wire Ctrl+C copy (active cell or selected rows as TSV)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Wire Paste (Cmd/Ctrl+V) + bulk-clear (Delete/Backspace) + `onCreateRows`

**Files:**
- Modify: `components/data-table/use-data-table.ts`
- Modify: `components/data-table/use-data-table.test.tsx`
- Modify: `components/data-table/data-table.tsx`
- Modify: `components/data-table/data-table.test.tsx`

**Interfaces:**
- Consumes: `parseTsv`, `planPaste` (Task 5).
- Produces: `UseDataTableOptions.onCreateRows?: (partialRows: Partial<TData>[]) => void`, `DataTableProps.onCreateRows?: (partialRows: Partial<TData>[]) => void` — threaded straight through. `handleKeyDown` now also handles Cmd/Ctrl+V and Delete/Backspace. Paste and bulk-clear each toast a summary.

- [ ] **Step 1: Write the failing tests for paste + bulk-clear**

Add to `components/data-table/use-data-table.test.tsx`, in a new `describe("useDataTable — paste + bulk-clear", ...)` block. This reuses the `navigator.clipboard` stub already added in Task 7 — set `readText`'s resolved value per-test via `mockResolvedValueOnce`.

```tsx
describe("useDataTable — paste + bulk-clear", () => {
  it("Ctrl+V pastes a TSV block starting at the active cell, committing one undo batch", async () => {
    const onUpdateData = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name"), col.number("age")],
        getRowId: (r) => r.id,
        editable: true,
        onUpdateData,
      }),
    )
    act(() => result.current.runtime.setActiveCell({ rowId: "1", columnId: "name" }))
    vi.mocked(navigator.clipboard.readText).mockResolvedValueOnce("Baily\t45\nAdah\t31")
    await act(async () =>
      result.current.runtime.handleKeyDown({
        key: "v",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )
    expect(onUpdateData).toHaveBeenCalledWith("1", "name", "Baily")
    expect(onUpdateData).toHaveBeenCalledWith("1", "age", 45)
    expect(onUpdateData).toHaveBeenCalledWith("2", "name", "Adah")
    expect(onUpdateData).toHaveBeenCalledWith("2", "age", 31)
    // One undo step for the whole paste, not four.
    expect(result.current.runtime.canUndo).toBe(true)
    onUpdateData.mockClear()
    act(() => result.current.runtime.undo())
    expect(onUpdateData).toHaveBeenCalledTimes(4)
    expect(result.current.runtime.canUndo).toBe(false)
  })

  it("a paste that skips a non-editable column still applies to the editable ones", async () => {
    const onUpdateData = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name", { editable: false }), col.number("age")],
        getRowId: (r) => r.id,
        editable: true,
        onUpdateData,
      }),
    )
    act(() => result.current.runtime.setActiveCell({ rowId: "1", columnId: "name" }))
    vi.mocked(navigator.clipboard.readText).mockResolvedValueOnce("Baily\t45")
    await act(async () =>
      result.current.runtime.handleKeyDown({
        key: "v",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )
    expect(onUpdateData).not.toHaveBeenCalledWith("1", "name", "Baily")
    expect(onUpdateData).toHaveBeenCalledWith("1", "age", 45)
  })

  it("a paste block extending past the last row reports the extra rows via onCreateRows", async () => {
    const onCreateRows = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA, // 2 rows
        columns: [col.text("name"), col.number("age")],
        getRowId: (r) => r.id,
        editable: true,
        onCreateRows,
      }),
    )
    act(() => result.current.runtime.setActiveCell({ rowId: "1", columnId: "name" }))
    vi.mocked(navigator.clipboard.readText).mockResolvedValueOnce(
      "Baily\t45\nAdah\t31\nChris\t22",
    )
    await act(async () =>
      result.current.runtime.handleKeyDown({
        key: "v",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )
    expect(onCreateRows).toHaveBeenCalledWith([{ name: "Chris", age: 22 }])
  })

  it("Delete with a selected active cell clears it to undefined as one undo step", () => {
    const onUpdateData = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name")],
        getRowId: (r) => r.id,
        editable: true,
        onUpdateData,
      }),
    )
    act(() => result.current.runtime.setActiveCell({ rowId: "1", columnId: "name" }))
    act(() =>
      result.current.runtime.handleKeyDown({
        key: "Delete",
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )
    expect(onUpdateData).toHaveBeenCalledWith("1", "name", undefined)
  })

  it("Backspace with selected rows clears every editable column in every selected row", () => {
    const onUpdateData = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name"), col.number("age", { editable: false })],
        getRowId: (r) => r.id,
        editable: true,
        enableRowSelection: true,
        onUpdateData,
      }),
    )
    act(() => result.current.runtime.toggleRowSelected("1", true, false))
    act(() => result.current.runtime.toggleRowSelected("2", true, true))
    act(() =>
      result.current.runtime.handleKeyDown({
        key: "Backspace",
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )
    expect(onUpdateData).toHaveBeenCalledWith("1", "name", undefined)
    expect(onUpdateData).toHaveBeenCalledWith("2", "name", undefined)
    expect(onUpdateData).not.toHaveBeenCalledWith("1", "age", undefined) // age isn't editable
  })

  it("Delete/Backspace while editing a cell does not trigger bulk-clear (normal text editing keeps working)", () => {
    const onUpdateData = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name")],
        getRowId: (r) => r.id,
        editable: true,
        onUpdateData,
      }),
    )
    act(() => result.current.runtime.beginEdit({ rowId: "1", columnId: "name" }))
    act(() =>
      result.current.runtime.handleKeyDown({
        key: "Backspace",
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    )
    expect(onUpdateData).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx`
Expected: FAIL — Ctrl+V/Delete/Backspace currently fall through to `nav.handleKeyDown`, which does nothing with them.

- [ ] **Step 3: Wire it up in `use-data-table.ts`**

Add the import:

```ts
import { parseTsv, planPaste } from "./clipboard"
```

Add `onCreateRows` to `UseDataTableOptions`:

```ts
export type UseDataTableOptions<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  getRowId?: (row: TData, index: number) => string
  editable?: boolean
  onUpdateData?: (rowId: string, columnId: string, value: unknown) => void
  /** Reports rows a paste block extends past the last existing row — the library never appends to `data` itself, matching onUpdateData's own contract. */
  onCreateRows?: (partialRows: Partial<TData>[]) => void
  enablePagination?: boolean
  enableRowSelection?: boolean
  manualPagination?: boolean
  totalRowCount?: number
}
```

Destructure it in the function signature (add `onCreateRows,` alongside the existing `onUpdateData,`).

Add `paste` and `clearSelectedOrActiveCells` callbacks right after the `copy` callback from Task 7:

```ts
  const paste = React.useCallback(async () => {
    const active = nav.activeCell
    if (!active) return
    const text = await navigator.clipboard.readText()
    if (!text) return

    const startRowIndex = rowIds.indexOf(active.rowId)
    const startColIndex = columnIds.indexOf(active.columnId)
    if (startRowIndex === -1 || startColIndex === -1) return

    const cols = columnIds.map((id) => {
      const meta = table.getColumn(id)?.columnDef.meta as DataTableColumnMeta | undefined
      return {
        id,
        toClipboard: meta?.toClipboard ?? ((v: unknown) => String(v ?? "")),
        // Gated through the SAME per-column editability check inline editing
        // uses — a column can have a working fromClipboard (every field
        // does) but still be non-editable, in which case paste must skip it
        // exactly like it would for a manual edit attempt.
        fromClipboard: isColumnEditable(id) ? meta?.fromClipboard : undefined,
      }
    })

    const plan = planPaste<TData>(parseTsv(text), startRowIndex, startColIndex, rowIds, cols)
    if (plan.updates.length > 0) commitBatch(plan.updates)
    if (plan.newRows.length > 0) onCreateRows?.(plan.newRows)

    const cellCount =
      plan.updates.length + plan.newRows.reduce((n, row) => n + Object.keys(row).length, 0)
    if (cellCount > 0) toast(`Pasted ${cellCount} cell${cellCount === 1 ? "" : "s"}`)
  }, [nav.activeCell, rowIds, columnIds, table, isColumnEditable, commitBatch, onCreateRows])

  const clearSelectedOrActiveCells = React.useCallback(() => {
    const selectedRows = table.getSelectedRowModel().rows
    const editableColumnIds = columnIds.filter((id) => isColumnEditable(id))
    let ops: { rowId: string; columnId: string; value: unknown }[] = []

    if (selectedRows.length > 0) {
      ops = selectedRows.flatMap((row) =>
        editableColumnIds.map((columnId) => ({ rowId: row.id, columnId, value: undefined })),
      )
    } else if (nav.activeCell && isColumnEditable(nav.activeCell.columnId)) {
      ops = [{ rowId: nav.activeCell.rowId, columnId: nav.activeCell.columnId, value: undefined }]
    }

    if (ops.length === 0) return
    commitBatch(ops)
    toast(`Cleared ${ops.length} cell${ops.length === 1 ? "" : "s"}`)
  }, [table, columnIds, isColumnEditable, nav.activeCell, commitBatch])
```

Extend `handleKeyDown` once more:

```ts
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === "c" && !nav.editingCell) {
        e.preventDefault()
        void copy()
        return
      }
      if (mod && e.key.toLowerCase() === "v" && !nav.editingCell) {
        e.preventDefault()
        void paste()
        return
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !nav.editingCell) {
        e.preventDefault()
        clearSelectedOrActiveCells()
        return
      }
      nav.handleKeyDown(e)
    },
    [nav, undo, redo, copy, paste, clearSelectedOrActiveCells],
  )
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx`
Expected: PASS (all tests, existing + the 6 new paste/bulk-clear tests).

- [ ] **Step 5: Thread `onCreateRows` through `DataTable`'s public props**

In `components/data-table/data-table.tsx`, add `onCreateRows` to `DataTableProps` right next to the existing `onUpdateData`:

```ts
export type DataTableProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  getRowId?: (row: TData, index: number) => string
  editable?: boolean
  onUpdateData?: (rowId: string, columnId: string, value: unknown) => void
  onCreateRows?: (partialRows: Partial<TData>[]) => void
  enablePagination?: boolean
  enableRowSelection?: boolean
  manualPagination?: boolean
  totalRowCount?: number
  calculableColumns?: CalculableColumn[]
  computeAggregate?: (args: ComputeAggregateArgs) => Promise<number>
}
```

`useDataTable(props)` already spreads all of `props` into `UseDataTableOptions` at the call site (`const { table, runtime } = useDataTable(props)`), so `onCreateRows` flows through automatically — no other change needed in `data-table.tsx` for this step.

- [ ] **Step 6: Add a `DataTable`-level test for `onCreateRows` threading**

Add to `components/data-table/data-table.test.tsx`, in the existing `describe("DataTable — row selection", ...)` block or a new one — check the file's current structure first and match its style:

```tsx
describe("DataTable — paste creates rows", () => {
  it("passes onCreateRows through to useDataTable so a paste extending past the last row is reported", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(), readText: vi.fn().mockResolvedValue("Chris\t22") },
      configurable: true,
      writable: true,
    })
    const onCreateRows = vi.fn()
    const { container } = render(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        editable
        onCreateRows={onCreateRows}
      />,
    )
    const firstCell = container.querySelector("tbody tr td div[tabindex]") as HTMLElement
    firstCell.focus()
    fireEvent.focus(firstCell)
    await act(async () =>
      fireEvent.keyDown(container.querySelector(".rounded-md.border")!, {
        key: "v",
        ctrlKey: true,
      }),
    )
    expect(onCreateRows).toHaveBeenCalled()
  })
})
```

Before pasting this in, open `components/data-table/data-table.test.tsx` and confirm the file's actual `columns()`/`DATA` fixture (should already be `[{id, name, age}]`-shaped from earlier tasks) and whether `act`/`fireEvent` are already imported — adapt import lines if needed.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/data-table/data-table.test.tsx components/data-table/use-data-table.test.tsx`
Expected: PASS.

- [ ] **Step 8: Run the broader regression + lint + typecheck**

Run: `pnpm exec vitest run components/data-table/ components/table-fields/`
Expected: 100% pass.

Run: `pnpm typecheck && pnpm exec eslint components/data-table/use-data-table.ts components/data-table/use-data-table.test.tsx components/data-table/data-table.tsx components/data-table/data-table.test.tsx`
Expected: both clean.

- [ ] **Step 9: Commit**

```bash
git add components/data-table/use-data-table.ts components/data-table/use-data-table.test.tsx components/data-table/data-table.tsx components/data-table/data-table.test.tsx
git commit -m "feat(data-table): wire Ctrl+V paste + Delete/Backspace bulk-clear + onCreateRows

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: Export CSV toolbar button

**Files:**
- Modify: `components/data-table/data-table.tsx`
- Modify: `components/data-table/data-table.test.tsx`

**Interfaces:**
- Consumes: `exportCsv`, `downloadCsv` (Task 6).
- Produces: a toolbar "Export CSV" button next to the existing Columns menu.

- [ ] **Step 1: Write the failing test**

Add to `components/data-table/data-table.test.tsx`:

```tsx
describe("DataTable — export CSV", () => {
  it("renders an Export CSV button that downloads the current (sorted/filtered/visible) view", () => {
    const downloadSpy = vi.fn()
    // downloadCsv is a thin DOM wrapper (Blob + anchor click) with no
    // jsdom-observable side effect worth asserting on directly — spy on the
    // module instead of inspecting the DOM download, matching this file's
    // existing sonner-mocking convention.
    vi.doMock("./export-csv", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./export-csv")>()
      return { ...actual, downloadCsv: downloadSpy }
    })
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }))
    expect(downloadSpy).toHaveBeenCalled()
    const [filename, csv] = downloadSpy.mock.calls[0]
    expect(filename).toMatch(/\.csv$/)
    expect(csv).toContain("Name,Age")
  })
})
```

Note: `vi.doMock` (not the hoisted `vi.mock`) is used here specifically because this one test needs a DIFFERENT mock than the rest of the file — check `components/data-table/data-table.test.tsx`'s existing top-of-file structure first; if it's simpler in practice to instead directly assert on a `Blob`/anchor click via `vi.spyOn(document, "createElement")`, use whichever approach the file's own established test conventions favor. The assertion that matters is: clicking the button produces a CSV string containing the right header/rows.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/data-table.test.tsx`
Expected: FAIL — no "Export CSV" button exists yet.

- [ ] **Step 3: Wire it up in `data-table.tsx`**

`data-table.tsx` already imports `Table` from `@/components/ui/table` (the shadcn JSX component that renders the actual `<table>` markup) — TanStack's `Table<TData>` type (the query-engine object, unrelated) needs an alias to avoid colliding with it. Change the file's existing `import { flexRender, type Column, type ColumnDef } from "@tanstack/react-table"` line to also pull in TanStack's `Table` type under an alias:

```ts
import { flexRender, type Column, type ColumnDef, type Table as ReactTable } from "@tanstack/react-table"
```

Add the remaining new imports:

```ts
import { Download } from "lucide-react"
```

```ts
import { downloadCsv, exportCsv } from "./export-csv"
```

Add a small internal component right after `pinnedStyle` (before the `DataTable` function):

```tsx
function ExportCsvButton<TData>({ table }: { table: ReactTable<TData> }) {
  function handleExport() {
    const columns = table
      .getVisibleLeafColumns()
      .filter((column) => column.id !== ROW_GUTTER_COLUMN_ID)
      .map((column) => {
        const meta = column.columnDef.meta as DataTableColumnMeta | undefined
        return {
          id: column.id,
          label: meta?.label ?? column.id,
          toClipboard: meta?.toClipboard ?? ((v: unknown) => String(v ?? "")),
        }
      })
    const rows = table.getSortedRowModel().rows.map((row) => {
      const values: Record<string, unknown> = {}
      for (const column of columns) values[column.id] = row.getValue(column.id)
      return values
    })
    const csv = exportCsv(rows, columns)
    downloadCsv("export.csv", csv)
    toast(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"} to CSV`)
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleExport} aria-label="Export CSV">
      <Download className="size-4" aria-hidden="true" />
      Export CSV
    </Button>
  )
}
```

This needs `ROW_GUTTER_COLUMN_ID` and `DataTableColumnMeta` imported — check the file's existing imports first; `DataTableColumnMeta` is likely already imported (it's used by `pinnedStyle`'s sibling code), and `ROW_GUTTER_COLUMN_ID` needs a new import:

```ts
import { ROW_GUTTER_COLUMN_ID } from "./row-gutter"
```

Add `toast` too:

```ts
import { toast } from "sonner"
```

Now render it in the toolbar row, next to `<ColumnsMenu>`:

```tsx
        <div className="flex items-center gap-2">
          <ColumnsMenu table={table} />
          <ExportCsvButton table={table} />
        </div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/data-table.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the broader regression + lint + typecheck**

Run: `pnpm exec vitest run components/data-table/ components/table-fields/`
Expected: 100% pass.

Run: `pnpm typecheck && pnpm exec eslint components/data-table/data-table.tsx components/data-table/data-table.test.tsx`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add components/data-table/data-table.tsx components/data-table/data-table.test.tsx
git commit -m "feat(data-table): add Export CSV toolbar button

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: Barrel export

**Files:**
- Modify: `components/data-table/index.ts`
- Modify: `components/data-table/index.test.ts`

**Interfaces:**
- Produces: the full public surface of this plan, re-exported from `components/data-table`.

- [ ] **Step 1: Write the failing test**

Open `components/data-table/index.test.ts` first to confirm its current exact array-based structure (established in Plan 3 Task 8), then add these names to the existing array:

```ts
      "createUndoStack",
      "parseTsv",
      "gridToTsv",
      "planPaste",
      "exportCsv",
      "downloadCsv",
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/index.test.ts`
Expected: FAIL — `toHaveProperty` fails for the new names.

- [ ] **Step 3: Extend `index.ts`**

Add these export lines to `components/data-table/index.ts`, grouped near the existing exports for their respective modules:

```ts
export { createUndoStack, type UndoStack, type UndoBatch, type CellEdit } from "./undo"
export { parseTsv, gridToTsv, planPaste, type ClipboardColumn, type PastePlan } from "./clipboard"
export { exportCsv, downloadCsv, type CsvColumn } from "./export-csv"
```

Also confirm `DataTable`'s exported prop types (from `data-table.tsx`) already flow through the barrel's existing `export type { DataTableProps }`-style line (they should, since `onCreateRows` was added to the EXISTING `DataTableProps` type in Task 8, not a new type) — no change needed there.

- [ ] **Step 4: Run the test to verify it passes, then the full suite**

Run: `pnpm exec vitest run components/data-table/index.test.ts`
Expected: PASS.

Run: `pnpm exec vitest run components/data-table/ components/table-fields/`
Expected: 100% pass.

- [ ] **Step 5: Typecheck + lint + commit**

Run: `pnpm typecheck && pnpm exec eslint components/data-table/index.ts`
Expected: both clean.

```bash
git add components/data-table/index.ts components/data-table/index.test.ts
git commit -m "feat(data-table): export undo/clipboard/export-csv public surface from barrel

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: Registry item update + rebuild

**Files:**
- Modify: `registry.json`
- Rebuild: `public/r/data-table.json`, `public/r/data-table-radix.json`, `public/r/registry.json`

- [ ] **Step 1: Add the 3 new files to both `data-table` and `data-table-radix`'s `files` arrays**

In `registry.json`, add these entries to BOTH items (identical in each — these 3 files are base/Radix-agnostic, no `.radix.tsx` twin needed, matching how `aggregate.ts`/`use-footer-aggregation.ts` are already shared as-is):

```json
        { "path": "components/data-table/undo.ts", "type": "registry:lib", "target": "components/data-table/undo.ts" },
        { "path": "components/data-table/clipboard.ts", "type": "registry:lib", "target": "components/data-table/clipboard.ts" },
        { "path": "components/data-table/export-csv.ts", "type": "registry:lib", "target": "components/data-table/export-csv.ts" }
```

- [ ] **Step 2: Add the `sonner` npm dependency + `sonner` registryDependency to both items**

In `registry.json`, find each item's top-level `"dependencies"` array (currently `["@tanstack/react-table", "lucide-react"]` for both `data-table` and `data-table-radix`) and add `"sonner"`:

```json
      "dependencies": ["@tanstack/react-table", "lucide-react", "sonner"],
```

Find each item's `"registryDependencies"` array and add `"sonner"` (the standard shadcn registry item name for the toast primitive — confirm this is the correct registry key, not e.g. `"toast"`, by checking the shadcn registry index via Context7 or `gh api` before committing, matching this repo's established practice of verifying upstream shadcn shapes rather than guessing):

```json
      "registryDependencies": [
        "@kotsas-ui/table-fields",
        "table",
        "button",
        "checkbox",
        "popover",
        "input",
        "sonner"
      ],
```

- [ ] **Step 3: Validate JSON + build**

Run: `node -e "require('./registry.json')"` — expect no throw.
Run: `pnpm registry:build` — expect it rebuilds all 5 items with no error.

- [ ] **Step 4: Verify the built items**

Run:
```bash
node -e "const j=require('./public/r/data-table.json'); console.log(j.files.some(f=>f.path==='components/data-table/undo.ts'), j.files.some(f=>f.path==='components/data-table/clipboard.ts'), j.files.some(f=>f.path==='components/data-table/export-csv.ts'), j.dependencies.includes('sonner'), j.registryDependencies.includes('sonner'))"
```
Expected output: `true true true true true`

Run the same check against `public/r/data-table-radix.json`.

Run:
```bash
node -e "const j=require('./public/r/data-table.json'); console.log(j.files.every(f=>!f.path.includes('.test.')))"
```
Expected output: `true`

- [ ] **Step 5: Commit**

```bash
git add registry.json public/r/
git commit -m "feat(data-table): publish undo/clipboard/export-csv files + sonner dep in the registry

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: Demo route — undo/redo + copy/paste + CSV export example

**Files:**
- Modify: `app/(examples)/data-table-demo/data-table-client.tsx`

- [ ] **Step 1: Wire `<Toaster />` and `onCreateRows` into the demo**

Read `app/(examples)/data-table-demo/data-table-client.tsx` in full first (established in Plan 3 Task 10 — it holds `data` in local state, wires `onUpdateData`, and already exercises `enableRowSelection`/`calculableColumns`).

Add the `Toaster` import:

```ts
import { Toaster } from "@/components/ui/sonner"
```

Add an `onCreateRows` handler that appends new rows to local state (mirroring the existing `handleUpdateData`'s local-state-mutation pattern) and render `<Toaster />` once, alongside the `<DataTable>`:

```tsx
  const handleCreateRows = React.useCallback((partialRows: Partial<Task>[]) => {
    setData((prev) => [
      ...prev,
      ...partialRows.map((partial, i) => ({
        id: `new-${Date.now()}-${i}`,
        title: "",
        assignee: "",
        priority: "medium" as const,
        status: "todo" as const,
        hoursLogged: 0,
        budget: 0,
        completed: false,
        dueDate: new Date().toISOString(),
        ...partial,
      })),
    )
  }, [])
```

Before writing this literal default-row shape, open `app/(examples)/data-table-demo/data.ts` (or wherever `Task` is defined) to confirm the actual field names/types match — adapt the defaults to whatever the real `Task` shape is rather than assuming.

Update the JSX:

```tsx
  return (
    <>
      <DataTable<Task>
        data={data}
        columns={columns}
        getRowId={(row) => row.id}
        editable
        onUpdateData={handleUpdateData}
        onCreateRows={handleCreateRows}
        enableRowSelection
        calculableColumns={[
          { columnId: "hoursLogged", default: "sum" },
          { columnId: "budget", methods: ["sum", "avg"], default: "sum" },
        ]}
      />
      <Toaster />
    </>
  )
```

Update the component's doc comment to mention the new behavior:

```tsx
/**
 * Manual smoke-test harness for <DataTable>: `editable` is on at the table
 * level, three columns (`priority`, `hoursLogged`, `dueDate`) override it to
 * `editable: false` via `defineColumns`'s per-column `editable` option, and
 * `onUpdateData` mutates local state (not just console.log) so committed
 * edits are visibly reflected in the grid. `enableRowSelection` turns on the
 * row-number/checkbox gutter and tri-state select-all; `calculableColumns`
 * exercises the footer's method picker and client-side aggregation over
 * `hoursLogged`/`budget`. `onCreateRows` appends rows pasted past the end of
 * the table to local state; `<Toaster />` renders undo/redo/paste/clear/
 * export confirmation toasts.
 */
```

- [ ] **Step 2: Verify manually in the browser**

Start the dev server, navigate to `/data-table-demo`. Confirm:
- Editing a cell, then pressing Cmd/Ctrl+Z, reverts it and shows a "Change undone" toast with a Redo button; clicking Redo (or Cmd/Ctrl+Shift+Z) reapplies it and shows "Change redone".
- Selecting a cell's text and copying (Cmd/Ctrl+C) with no rows selected, then pasting into a spreadsheet app, produces the cell's plain value.
- Selecting several rows (via the row-gutter checkboxes) and copying produces a tab-separated block in a real spreadsheet paste.
- Copying 2x2 cells from a spreadsheet and pasting (Cmd/Ctrl+V) into the grid, starting at an editable cell, fills the corresponding cells and shows a "Pasted N cells" toast; a single Cmd/Ctrl+Z undoes the whole paste at once, not cell-by-cell.
- Pasting a block that extends past the last row appends new rows to the table (via `onCreateRows`).
- Selecting rows and pressing Delete/Backspace clears their editable cells and shows a "Cleared N cells" toast; typing inside an actively-edited cell and pressing Backspace still deletes characters normally (does NOT trigger bulk-clear).
- Clicking "Export CSV" downloads a file whose contents match the currently visible/sorted rows and columns.

If anything doesn't match, fix the source (not the demo) and re-verify.

- [ ] **Step 3: Typecheck + lint + commit**

Run: `pnpm typecheck && pnpm exec eslint "app/(examples)/data-table-demo/"`

```bash
git add "app/(examples)/data-table-demo/data-table-client.tsx"
git commit -m "chore(data-table): exercise undo/redo + copy/paste + CSV export in /data-table-demo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 13: Final verification

- [ ] **Step 1: Full suite**

Run: `pnpm exec vitest run` — expect all suites pass (grouped-data-table + table-fields + data-table).

- [ ] **Step 2: Typecheck + lint + production build**

Run: `pnpm typecheck && pnpm exec eslint components/data-table components/table-fields components/ui && pnpm build` — expect all clean.

- [ ] **Step 3: Manual smoke test (browser)**

Beyond Task 12's feature-specific checklist, confirm nothing from Plans 1-3 regressed with the new keyboard shortcuts layered in:
- Arrow-key/Tab navigation, Enter-to-edit, Escape-to-cancel all still work exactly as before (Cmd/Ctrl+Z/C/V/Delete/Backspace are the only new interceptions; everything else still falls through to `nav.handleKeyDown` unchanged).
- Sort/hide/pin/resize columns still work with the new toolbar's "Export CSV" button sitting next to "Columns" without layout issues.
- Row selection + tri-state select-all + shift-click range-select (Plan 3) still work; footer calc still works.
- A read-only table (`editable` not set) still allows copy (Cmd/Ctrl+C) but silently no-ops on paste/bulk-clear (no editable columns for `planPaste`/`clearSelectedOrActiveCells` to touch).

- [ ] **Step 4: Final holistic review**

Dispatch a final code-quality review across the full branch diff (`git diff main...feat/data-table-undo-clipboard`), the same kind of integration-level pass done at the end of Plans 2 and 3 — it catches cross-file issues no single task's review can see. Specifically prompt it to check:
- Does the composed `handleKeyDown` in `use-data-table.ts` correctly compose across ALL of Tasks 3/7/8's additions (Ctrl+Z/Shift+Z, Ctrl+C, Ctrl+V, Delete/Backspace) with no missing `!nav.editingCell` guard anywhere it's needed, and no stale closure over `undo`/`redo`/`copy`/`paste`/`clearSelectedOrActiveCells` in its dependency array?
- Does `commitBatch` correctly dedupe same-cell ops within one batch (the `seen` Set in Task 3) in a way that's still correct for Task 8's paste (which could theoretically produce duplicate `{rowId, columnId}` pairs if `planPaste` is ever called with malformed input)?
- Does `paste`'s per-column `fromClipboard: isColumnEditable(id) ? meta?.fromClipboard : undefined` in Task 8 correctly re-derive on every paste (not stale from when the column was first rendered), given `isColumnEditable` could theoretically change if a consumer's `editable` prop changes at runtime?
- Is there any registry-divergence risk (base-ui vs. Radix) in anything newly added this plan, the same class of bug the Plan 3 final review caught in `row-gutter.tsx`/`footer-aggregation.tsx`? (`export-csv.ts`/`clipboard.ts`/`undo.ts` are pure TS with zero UI-primitive imports, and `components/ui/sonner.tsx` only touches `sonner`/`next-themes`, not base-ui/Radix — but verify this claim rather than trusting it.)
- Does the sonner `toast()` call pattern used throughout this plan risk toast spam (e.g. does rapid-fire Cmd+Z holding produce one toast per undo correctly, or could React batching cause missed/duplicate toasts)?

- [ ] **Step 5: Finish the branch**

Use `superpowers:finishing-a-development-branch` to decide how to land this (merge to main, PR, etc.), following the same pattern as Plans 1, 2, and 3.

---

## Self-Review notes (already applied)

- **Spec coverage:** Undo/redo with Cmd/Ctrl+Z/Shift+Z ✓ Task 3; sonner toasts for undo/redo/paste/bulk-clear/export ✓ Tasks 4/8/9; copy as TSV (active cell or selected rows) ✓ Task 7; paste as rectangular TSV with `onCreateRows` for overflow, one undoable batch ✓ Task 8; CSV export via a pure util + toolbar button, respecting sort/visible-columns ✓ Tasks 6/9. **Explicitly out of scope** (see "Scope decisions" above, all deliberate): a selection banner, toolbar undo/redo buttons, toolbar copy/paste buttons, selection-scoped export, formula-fill on paste (the last two are the architecture spec's own stated non-goals for R1).
- **Type consistency:** `CellEdit`/`UndoBatch`/`UndoStack` (Task 1) are used verbatim by `use-data-table.ts` (Task 3) with no renaming. `ClipboardColumn`/`PastePlan<TData>` (Task 5) are used verbatim by the `copy`/`paste` callbacks (Tasks 7/8) — same field names (`toClipboard`, `fromClipboard`, `updates`, `newRows`) throughout. `DataTableColumnMeta.toClipboard`/`.fromClipboard` (Task 1) are populated by `define-columns.tsx` (Task 2) and consumed identically by `copy` (Task 7), `paste` (Task 8), and `ExportCsvButton` (Task 9) — every consumer falls back to `meta?.toClipboard ?? ((v) => String(v ?? ""))` for raw-`ColumnDef` escape-hatch columns with no field-driven meta, consistently.
- **No placeholders:** every step has complete code and exact commands; no "add appropriate error handling"/"TBD"/"similar to Task N" — every task's code is written out in full even where it echoes a nearby task's shape (e.g. Task 8's `clearSelectedOrActiveCells` reuses `commitBatch` but is fully spelled out, not described as "like updateData").
