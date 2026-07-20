# Unified DataTable Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold `GroupedDataTable` into `DataTable` as an opt-in `grouping` prop, delete the ~920 lines duplicated between the two families, and reduce `GroupedDataTable` to a transitional wrapper — so one grid engine serves both.

**Architecture:** Grouping state (`grouping`, `expanded`) joins the seven pieces of state `useDataTable` already owns, gated behind one optional `grouping` prop; omit it and the table behaves exactly as today. The auto group column is injected like the existing row-gutter column (a table-owned `ColumnDef` outside `defineColumns`). `useGridNavigation`'s edit gate widens from per-column to per-cell so group rows are navigable but never editable. The drag-and-drop dimension picker moves to its own registry item so `data-table` never pulls in dnd-kit; `DataTable` renders it through a `grouping.renderControl` slot.

**Tech Stack:** React 19, TypeScript strict, `@tanstack/react-table@8.21.3`, Vitest + Testing Library + jsdom, shadcn registry (base-ui + Radix builds), `@kotsas-ui/table-fields` (registryDependency).

**Spec:** `docs/superpowers/specs/2026-07-20-unified-data-table-grouping-design.md`

## Global Constraints

- **Flat tables must not regress.** With `grouping` omitted, behaviour, rendered markup, and installed npm dependencies are unchanged. `data-table`'s deps stay exactly `@tanstack/react-table`, `lucide-react`, `sonner` — **no dnd-kit in `data-table`, ever.**
- **The four grouped suites are the compatibility contract.** `grouped-data-table.test.tsx`, `use-grouped-table.test.tsx`, `group-cell.test.tsx`, `dimension-picker.test.tsx` must pass **unmodified**. If a change to one of these seems necessary, **stop and flag it** — it is a regression signal, not a test to update. (Contrast: `use-grid-navigation.test.ts` *is* updated in Task 2, deliberately, because that hook's API changes.)
- **Dual-base parity.** Every `*.tsx` with a base-ui/Radix split keeps both builds and its `primitives.parity.test.ts`.
- **Group row ids never reach `updateData`.** Group rows carry TanStack-synthesised ids (`stage:won>owner:maria`), not `TData` ids.
- **Row grouping only.** No column pivoting. No server-side grouping.
- **Grouping is uncontrolled**, like all other table state — `grouping.initial` is a mount-only seed. No `value`/`onChange` pair.
- Commands: `pnpm exec vitest run <path>`, `pnpm typecheck`, `pnpm exec eslint <path>`, `pnpm registry:build`. If `pnpm` is not on PATH, use `corepack pnpm` instead. Run all commands from the repo root.

## Scope decisions (read before implementing)

Deliberate bounded choices, not omissions:

1. **Clipboard, paste, bulk-clear, CSV export, and footer aggregation operate on leaf rows only** when grouping is active. Group rows are filtered out of `pasteRowIds` and of every row set used for copy/export/aggregation. This is well-defined, not deferred. Rationale: a group row's `getValue()` returns a rolled-up aggregate of the very children beside it, so counting both double-counts.
2. **Group rows are navigable but never editable.** `Enter` on a group row toggles expansion instead of entering edit mode.
3. **The auto group column is NOT pinned by default.** The spec floated pinning it left; that would run it through `pinnedStyle`'s sticky/opaque-background machinery, which is a separate visual risk not worth bundling into this change. Consumers who want it pinned pass `initialColumnPinning={{ left: [GROUP_COLUMN_ID] }}`. Revisit as a follow-up.
4. **`GroupedDataTable`'s public API is frozen.** The wrapper adds no props. Anything new belongs on `DataTable`.
5. **Phase 3 of the spec (deleting `GroupedDataTable`) is NOT in this plan.** It needs a release window. This plan ends with the wrapper shipping and deprecated.
6. **`useGroupedTable` survives as an adapter**, because `use-grouped-table.test.tsx` is a compatibility suite. It returns the identical shape by delegating to `useDataTable`.
7. **Incomplete test stubs get fixed, and that is not a regression.** `row-gutter.test.tsx`'s `mockRow`/`mockTable` return bare objects lacking `getIsGrouped`, so leaf-filtering would throw on them. Those helpers are updated to model the real `Row` API. This is explicitly allowed — `row-gutter.test.tsx` is **not** one of the four protected compatibility suites, and only helpers change, never assertions.

## File Structure

**Create, under `components/data-table/`:**
- `grouping-utils.ts` (+ `.test.ts`) — `normalizeGrouping`, `deriveColumnVisibility`, `getGroupRowCount`. Moved from `grouped-data-table/`.
- `group-column.tsx` (+ `.test.tsx`) — `GROUP_COLUMN_ID`, `buildGroupColumn()`. Mirrors `row-gutter.tsx`'s structural-column pattern.
- `group-cell.tsx` (+ `.test.tsx`) — `GroupAwareCell`, the grouped/aggregated/placeholder/leaf render branch.
- `use-grouping.ts` (+ `.test.ts`) — grouping + expanded state, composed by `useDataTable` (keeps that file from growing past its current 603 lines).

**Create, under `components/dimension-picker/`** (new registry item):
- `dimension-picker.tsx`, `index.ts`, `dimension-picker.test.tsx` — moved from `grouped-data-table/`, re-importing `MultiSelect`/`PopoverButtonTrigger`/`DimensionDef` from `@/components/data-table` rather than carrying its own copies.

**Modify:**
- `components/data-table/use-grid-navigation.ts` (+ test) — edit gate widens to per-cell.
- `components/data-table/use-data-table.ts` — compose grouping; leaf-only paste rows.
- `components/data-table/data-table.tsx` — grouping toolbar slot + group-aware cell branch.
- `components/data-table/row-gutter.tsx` + `.radix.tsx` — leaf-only numbering, tri-state group checkbox.
- `components/data-table/use-footer-aggregation.ts` — leaf-only selection.
- `components/data-table/types.ts`, `index.ts` — grouping types + exports.
- `components/grouped-data-table/*` — reduced to a wrapper.
- `registry.json`, `README.md`, docs pages.

**Delete (Task 10):** `grouped-data-table/`'s `filter-utils.ts`, `filter-builder.tsx`, `multi-select.tsx`, `primitives.tsx`, `primitives.radix.tsx`, `use-grouped-table.ts` internals, `grouping-utils.ts`, `group-cell.tsx`, `cross-family-parity.test.ts`, and their duplicated tests.

---

## Task 0: Branch

- [ ] **Step 1: Create the feature branch**

```bash
git checkout main && git pull --ff-only origin main
git checkout -b feat/unified-data-table-grouping
```

- [ ] **Step 2: Confirm a green baseline**

Run: `pnpm exec vitest run && pnpm typecheck`
Expected: `Test Files 44 passed (44)`, `Tests 405 passed (405)`, and typecheck prints nothing.

If this is not green, **stop** — do not build on a red baseline.

---

## Task 1: Guard the duplicated filter types (spec Phase 0)

The five duplicated files are pinned byte-for-byte by `cross-family-parity.test.ts`, but the 42-line filter type block inside each family's `types.ts` is **not** — `types.ts` is excluded so the families' own props may differ. Close that window for as long as the copies exist.

**Files:**
- Modify: `components/grouped-data-table/cross-family-parity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks. Deleted in Task 10.

- [ ] **Step 1: Add the failing test**

Append inside `cross-family-parity.test.ts`, after the existing `describe` block:

```ts
/**
 * types.ts as a whole legitimately differs (each family's props differ), but the
 * FilterType→FilterState block inside it is duplicated verbatim. Compare just
 * that region so a divergence in filter types fails as loudly as one in
 * filter-utils.ts.
 */
function extractFilterTypeBlock(src: string): string {
  const start = src.indexOf("export type FilterType")
  const endMarker = "export type FilterState"
  const end = src.indexOf("\n", src.indexOf(endMarker) + endMarker.length)
  if (start === -1 || end === -1) throw new Error("filter type block not found")
  return src.slice(start, end).trim()
}

describe("cross-family filter type parity (data-table ↔ grouped-data-table)", () => {
  it("declares an identical FilterType→FilterState block in both families", () => {
    const ours = readFileSync(resolve(here, "types.ts"), "utf8")
    const theirs = readFileSync(resolve(sibling, "types.ts"), "utf8")
    expect(extractFilterTypeBlock(ours)).toBe(extractFilterTypeBlock(theirs))
  })
})
```

- [ ] **Step 2: Run it — it should PASS (the copies are currently identical)**

Run: `pnpm exec vitest run components/grouped-data-table/cross-family-parity.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 3: Prove the guard actually catches drift**

Temporarily append a line to the block in one copy:

```bash
# add a bogus member to data-table's copy only
sed -i.bak 's/^export type Combinator = "and" | "or"$/export type Combinator = "and" | "or" | "xor"/' components/data-table/types.ts
pnpm exec vitest run components/grouped-data-table/cross-family-parity.test.ts
```

Expected: **FAIL** on "declares an identical FilterType→FilterState block".

- [ ] **Step 4: Revert the perturbation and confirm green**

```bash
mv components/data-table/types.ts.bak components/data-table/types.ts
pnpm exec vitest run components/grouped-data-table/cross-family-parity.test.ts
```

Expected: PASS, 6 tests. Confirm `git diff --stat components/data-table/types.ts` shows **no** changes.

- [ ] **Step 5: Commit**

```bash
git add components/grouped-data-table/cross-family-parity.test.ts
git commit -m "test: pin the duplicated filter type block across table families"
```

---

## Task 2: Widen the grid-navigation edit gate from per-column to per-cell

Under grouping, editability is a property of the *cell*, not the column: the same column is editable on a leaf row and not on a group row. `useGridNavigation` is pure and already table-agnostic, so this is the only change it needs.

`isColumnEditable` on `DataTableRuntime` is **unchanged** — it stays column-level and is still used by `define-columns.tsx`, clipboard paste, and bulk-clear. Only the nav hook's own option changes.

**Files:**
- Modify: `components/data-table/use-grid-navigation.ts:7-11,59-66`
- Modify: `components/data-table/use-grid-navigation.test.ts:9,11,63`
- Modify: `components/data-table/use-data-table.ts:352`

**Interfaces:**
- Consumes: `CellPos` from `./types`.
- Produces: `UseGridNavigationOptions.isCellEditable: (pos: CellPos) => boolean` (replaces `isColumnEditable: (columnId: string) => boolean`). Task 5 supplies the grouping-aware implementation.

- [ ] **Step 1: Update the failing tests first**

In `components/data-table/use-grid-navigation.test.ts`, change the three call sites:

```ts
function setup(isCellEditable: (pos: CellPos) => boolean = () => true) {
  return renderHook(() =>
    useGridNavigation({ rowIds: ROW_IDS, columnIds: COL_IDS, isCellEditable }),
  )
}
```

and

```ts
    renderHook(() =>
      useGridNavigation({ rowIds: [], columnIds: [], isCellEditable: () => true }),
    ),
```

Add `import type { CellPos } from "./types"` at the top if not already present. Then add a new test proving the gate sees the whole position:

```ts
it("gates editing per cell, not per column — same column, different rows", () => {
  const { result } = setup((pos) => pos.rowId !== "r2")
  act(() => result.current.setActiveCell({ rowId: "r2", columnId: "c1" }))
  act(() => result.current.beginEdit({ rowId: "r2", columnId: "c1" }))
  expect(result.current.editingCell).toBeNull()

  act(() => result.current.beginEdit({ rowId: "r1", columnId: "c1" }))
  expect(result.current.editingCell).toEqual({ rowId: "r1", columnId: "c1" })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run components/data-table/use-grid-navigation.test.ts`
Expected: FAIL — TypeScript/runtime error that `isCellEditable` is not a function (the hook still reads `isColumnEditable`).

- [ ] **Step 3: Change the hook**

In `components/data-table/use-grid-navigation.ts`, replace the option in the type:

```ts
export type UseGridNavigationOptions = {
  rowIds: string[]
  columnIds: string[]
  /**
   * Whether THIS cell may enter edit mode. Per-cell, not per-column: under
   * grouping the same column is editable on a leaf row and not on a group row.
   * `use-data-table.ts` composes the column-level override with a group-row check.
   */
  isCellEditable: (pos: CellPos) => boolean
}
```

Update the destructure and `beginEdit`:

```ts
export function useGridNavigation({
  rowIds,
  columnIds,
  isCellEditable,
}: UseGridNavigationOptions): GridNavigation {
```

```ts
  const beginEdit = React.useCallback(
    (pos: CellPos) => {
      if (!isCellEditable(pos)) return
      setActiveCellState(pos)
      setEditingCell(pos)
    },
    [isCellEditable],
  )
```

- [ ] **Step 4: Update the caller (no behaviour change yet)**

In `components/data-table/use-data-table.ts`, replace line 352:

```ts
  // Per-cell gate. Today this only consults the column-level override; Task 5
  // adds the group-row check here. `isColumnEditable` stays column-level for
  // DataTableRuntime, clipboard paste, and bulk-clear.
  const isCellEditable = React.useCallback(
    (pos: CellPos) => isColumnEditable(pos.columnId),
    [isColumnEditable],
  )

  const nav = useGridNavigation({ rowIds, columnIds, isCellEditable })
```

Ensure `CellPos` is imported in `use-data-table.ts` (it imports from `./types` already — add `CellPos` to that import list).

- [ ] **Step 5: Run the full suite**

Run: `pnpm exec vitest run && pnpm typecheck`
Expected: zero failures, typecheck silent. The suite total grows by one (the new per-cell gate test); don't assert an absolute count — earlier tasks also add tests.

- [ ] **Step 6: Commit**

```bash
git add components/data-table/use-grid-navigation.ts components/data-table/use-grid-navigation.test.ts components/data-table/use-data-table.ts
git commit -m "refactor(data-table): widen grid-nav edit gate from per-column to per-cell"
```

---

## Task 3: Move the grouping utilities into data-table

**Files:**
- Create: `components/data-table/grouping-utils.ts`
- Create: `components/data-table/grouping-utils.test.ts`
- Modify: `components/data-table/types.ts`

**Interfaces:**
- Produces:
  - `GROUP_COLUMN_ID: "__group__"`
  - `type DimensionDef = { id: string; label: string }`
  - `type GroupLeafConfig<TData>`, `type GroupColumnConfig<TData>`
  - `type DataTableGroupingConfig<TData>`
  - `normalizeGrouping(next: string[], allowedIds: string[]): string[]`
  - `deriveColumnVisibility(grouping: string[]): VisibilityState`
  - `getGroupRowCount<TData>(row: Row<TData>, mode?: "leaf" | "immediate"): number`

- [ ] **Step 1: Copy the utilities and their tests verbatim**

```bash
cp components/grouped-data-table/grouping-utils.ts components/data-table/grouping-utils.ts
cp components/grouped-data-table/grouping-utils.test.ts components/data-table/grouping-utils.test.ts
```

Then in **both** new files, change the type import source from `./types` — it already is `./types`, so no edit is needed provided Step 2 lands the types. Verify with:
`grep -n "from \"./types\"" components/data-table/grouping-utils.ts`

- [ ] **Step 2: Add the grouping types to `components/data-table/types.ts`**

Append at the end of the file:

```ts
/** Stable id for the synthesized auto group column. */
export const GROUP_COLUMN_ID = "__group__" as const

/** A groupable column surfaced in the dimension picker. */
export type DimensionDef = {
  /** Must match the `id` of a column in `columns`. */
  id: string
  /** Human-readable label shown in the picker. */
  label: string
}

/**
 * Declarative leaf rendering: a primary label, with an optional leading icon and
 * an optional muted secondary line below it.
 */
export type GroupLeafConfig<TData> = {
  primary: (row: Row<TData>) => React.ReactNode
  secondary?: (row: Row<TData>) => React.ReactNode
  icon?: (row: Row<TData>) => React.ReactNode
}

export type GroupColumnConfig<TData> = {
  /** Header text for the auto group column, e.g. "Account". */
  header?: React.ReactNode
  /** Declarative leaf rendering. Ignored if `renderLeaf` is provided. */
  leaf?: GroupLeafConfig<TData>
  /** Full-control leaf renderer. Takes precedence over `leaf`. */
  renderLeaf?: (row: Row<TData>) => React.ReactNode
  /** "leaf" = total leaf descendants (default), "immediate" = direct sub-rows. */
  countMode?: "leaf" | "immediate"
  /** Pixels of indentation per depth level. Default 24. */
  indentSize?: number
}

/**
 * Opt-in grouping. Omit entirely for a flat table — no grouping state, no group
 * column, no behaviour change.
 */
export type DataTableGroupingConfig<TData> = {
  /** Which columns the user may group by. */
  dimensions: DimensionDef[]
  /** Initial hierarchy, applied once at mount (uncontrolled — see the design doc). */
  initial?: string[]
  /** Auto group column configuration. */
  column: GroupColumnConfig<TData>
  /**
   * Optional toolbar control for changing the hierarchy at runtime. Passed as a
   * render prop rather than imported, so `data-table` never depends on dnd-kit —
   * install `@kotsas-ui/dimension-picker` and pass its `<DimensionPicker />` here.
   */
  renderControl?: (ctx: {
    dimensions: DimensionDef[]
    grouping: string[]
    setGrouping: (next: string[]) => void
  }) => React.ReactNode
}
```

Add `import type { Row } from "@tanstack/react-table"` to the top of `types.ts` (it currently imports only `React`).

- [ ] **Step 3: Run the new tests**

Run: `pnpm exec vitest run components/data-table/grouping-utils.test.ts && pnpm typecheck`
Expected: PASS, and typecheck silent.

- [ ] **Step 4: Commit**

```bash
git add components/data-table/grouping-utils.ts components/data-table/grouping-utils.test.ts components/data-table/types.ts
git commit -m "feat(data-table): add grouping utilities and types"
```

---

## Task 4: Group column + group-aware cell rendering

**Files:**
- Create: `components/data-table/group-column.tsx`
- Create: `components/data-table/group-cell.tsx`
- Create: `components/data-table/group-cell.test.tsx`

**Interfaces:**
- Consumes: `GROUP_COLUMN_ID`, `GroupColumnConfig`, `getGroupRowCount` (Task 3).
- Produces:
  - `buildGroupColumn<TData>(config: GroupColumnConfig<TData>): ColumnDef<TData, unknown>`
  - `GroupAwareCell<TData>(props: { cell: Cell<TData, unknown>; groupColumn: GroupColumnConfig<TData> }): React.ReactNode`

- [ ] **Step 1: Write the failing test**

Create `components/data-table/group-cell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { Cell } from "@tanstack/react-table"

import { GroupAwareCell } from "./group-cell"
import { GROUP_COLUMN_ID } from "./types"

type Row = { id: string; name: string }

/** Minimal Cell stub — GroupAwareCell only reads these members. */
function makeCell(overrides: {
  columnId: string
  isGrouped?: boolean
  isAggregated?: boolean
  isPlaceholder?: boolean
  groupingValue?: unknown
  depth?: number
  canExpand?: boolean
  isExpanded?: boolean
  subRowCount?: number
}): Cell<Row, unknown> {
  const {
    columnId,
    isGrouped = false,
    isAggregated = false,
    isPlaceholder = false,
    groupingValue,
    depth = 0,
    canExpand = false,
    isExpanded = false,
    subRowCount = 0,
  } = overrides
  const row = {
    depth,
    groupingValue,
    getIsGrouped: () => isGrouped,
    getCanExpand: () => canExpand,
    getIsExpanded: () => isExpanded,
    getToggleExpandedHandler: () => () => {},
    subRows: Array.from({ length: subRowCount }, () => ({ subRows: [] })),
    getLeafRows: () => Array.from({ length: subRowCount }, () => ({})),
    original: { id: "1", name: "Ada" },
  }
  return {
    row,
    column: { id: columnId, columnDef: { cell: () => "LEAF-VALUE" } },
    getIsAggregated: () => isAggregated,
    getIsPlaceholder: () => isPlaceholder,
    getContext: () => ({}),
  } as unknown as Cell<Row, unknown>
}

describe("GroupAwareCell", () => {
  it("renders the grouping value and count on a group row's group column", () => {
    render(
      <GroupAwareCell
        cell={makeCell({
          columnId: GROUP_COLUMN_ID,
          isGrouped: true,
          groupingValue: "Acme",
          canExpand: true,
          subRowCount: 3,
        })}
        groupColumn={{ header: "Account" }}
      />,
    )
    expect(screen.getByText("Acme")).toBeInTheDocument()
    expect(screen.getByText("(3)")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Expand group" })).toBeInTheDocument()
  })

  it("renders developer leaf content on a leaf row's group column", () => {
    render(
      <GroupAwareCell
        cell={makeCell({ columnId: GROUP_COLUMN_ID })}
        groupColumn={{ leaf: { primary: (r) => r.original.name } }}
      />,
    )
    expect(screen.getByText("Ada")).toBeInTheDocument()
  })

  it("renders nothing for a placeholder cell", () => {
    const { container } = render(
      <GroupAwareCell
        cell={makeCell({ columnId: "name", isPlaceholder: true })}
        groupColumn={{}}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("falls through to the column's own cell renderer on a normal leaf cell", () => {
    render(
      <GroupAwareCell cell={makeCell({ columnId: "name" })} groupColumn={{}} />,
    )
    expect(screen.getByText("LEAF-VALUE")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run components/data-table/group-cell.test.tsx`
Expected: FAIL — cannot resolve `./group-cell`.

- [ ] **Step 3: Implement `group-cell.tsx`**

Create `components/data-table/group-cell.tsx`. This is the grouped family's `GroupCell` adapted so its final fallback is the column's own cell renderer — which in `DataTable` is `defineColumns`' editable cell, so editing keeps working on leaf rows for free.

```tsx
"use client"

import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { flexRender, type Cell, type Row } from "@tanstack/react-table"

import { cn } from "@/lib/utils"

import { getGroupRowCount } from "./grouping-utils"
import { GROUP_COLUMN_ID, type GroupColumnConfig } from "./types"

export type GroupAwareCellProps<TData> = {
  cell: Cell<TData, unknown>
  groupColumn: GroupColumnConfig<TData>
}

/**
 * Leaf content precedence: `renderLeaf` (full control) → declarative `leaf`
 * (icon?/primary/secondary?) → nothing.
 */
function renderLeafContent<TData>(
  row: Row<TData>,
  groupColumn: GroupColumnConfig<TData>,
): React.ReactNode {
  if (groupColumn.renderLeaf) return groupColumn.renderLeaf(row)

  const leaf = groupColumn.leaf
  if (!leaf) return null

  const icon = leaf.icon?.(row)
  const secondary = leaf.secondary?.(row)
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="flex flex-col">
        <span className="font-medium">{leaf.primary(row)}</span>
        {secondary != null && (
          <span className="text-xs text-muted-foreground">{secondary}</span>
        )}
      </div>
    </div>
  )
}

/**
 * Renders one cell in a grouping-enabled DataTable, branching on what the cell
 * actually is. The final branch delegates to the column's own `cell` renderer,
 * so an editable leaf cell still renders defineColumns' edit-capable cell.
 * Only mounted when `grouping` is configured — flat tables never reach here.
 */
export function GroupAwareCell<TData>({
  cell,
  groupColumn,
}: GroupAwareCellProps<TData>) {
  const { row, column } = cell
  const isGroupColumn = column.id === GROUP_COLUMN_ID
  const indentSize = groupColumn.indentSize ?? 24

  // Group row, group column: chevron + grouping value + (count).
  // Use row.getIsGrouped() (not cell.getIsGrouped()) because TanStack marks the
  // *grouping dimension* cell as grouped, never the synthesised __group__ cell.
  if (row.getIsGrouped() && isGroupColumn) {
    const count = getGroupRowCount(row, groupColumn.countMode)
    const canExpand = row.getCanExpand()
    return (
      <div
        className="flex items-center gap-1"
        style={{ paddingLeft: row.depth * indentSize }}
      >
        {canExpand ? (
          <button
            type="button"
            aria-label={row.getIsExpanded() ? "Collapse group" : "Expand group"}
            onClick={() => row.getToggleExpandedHandler()()}
            className={cn(
              "flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted",
            )}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden="true" />
        )}
        <span className="font-semibold">{String(row.groupingValue ?? "")}</span>
        <span className="text-muted-foreground">({count})</span>
      </div>
    )
  }

  // Leaf row, group column: developer-supplied leaf content, indented.
  if (isGroupColumn) {
    return (
      <div style={{ paddingLeft: (row.depth + 1) * indentSize }}>
        {renderLeafContent(row, groupColumn)}
      </div>
    )
  }

  // Aggregated cell (group row, non-group column).
  if (cell.getIsAggregated()) {
    return flexRender(
      cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
      cell.getContext(),
    )
  }

  // Placeholder (group row spanning a non-group column with no aggregation).
  if (cell.getIsPlaceholder()) return null

  // Normal leaf value — defineColumns' editable cell when the table is editable.
  return flexRender(cell.column.columnDef.cell, cell.getContext())
}
```

- [ ] **Step 4: Implement `group-column.tsx`**

Create `components/data-table/group-column.tsx`, mirroring `row-gutter.tsx`'s structural-column pattern:

```tsx
import type { ColumnDef } from "@tanstack/react-table"

import { GROUP_COLUMN_ID, type GroupColumnConfig } from "./types"

/**
 * Builds the synthesized auto group column. Prepended by useDataTable when
 * `grouping` is configured — a table-owned structural column with no TData
 * accessor, exactly like buildRowGutterColumn. Cell content is rendered by
 * GroupAwareCell in the table body; this only reserves the slot and the header.
 */
export function buildGroupColumn<TData>(
  config: GroupColumnConfig<TData>,
): ColumnDef<TData, unknown> {
  return {
    id: GROUP_COLUMN_ID,
    header: () => config.header ?? null,
    enableGrouping: false,
    enableSorting: false,
    enableHiding: false,
    enableResizing: true,
    cell: () => null,
  }
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm exec vitest run components/data-table/group-cell.test.tsx && pnpm typecheck`
Expected: PASS (4 tests), typecheck silent.

- [ ] **Step 6: Commit**

```bash
git add components/data-table/group-cell.tsx components/data-table/group-cell.test.tsx components/data-table/group-column.tsx
git commit -m "feat(data-table): add group column and group-aware cell rendering"
```

---

## Task 5: Grouping state hook

Extracted into its own file so `use-data-table.ts` (603 lines) doesn't keep growing — mirroring how `use-grid-navigation` and `use-footer-aggregation` already compose.

**Files:**
- Create: `components/data-table/use-grouping.ts`
- Create: `components/data-table/use-grouping.test.ts`

**Interfaces:**
- Consumes: `normalizeGrouping`, `deriveColumnVisibility` (Task 3), `DataTableGroupingConfig` (Task 3).
- Produces:
  ```ts
  useGrouping<TData>(config: DataTableGroupingConfig<TData> | undefined): {
    enabled: boolean
    grouping: string[]
    setGrouping: (next: string[]) => void
    expanded: ExpandedState
    setExpanded: OnChangeFn<ExpandedState>
    derivedVisibility: VisibilityState
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `components/data-table/use-grouping.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useGrouping } from "./use-grouping"

const CONFIG = {
  dimensions: [
    { id: "stage", label: "Stage" },
    { id: "owner", label: "Owner" },
  ],
  initial: ["stage"],
  column: { header: "Deal" },
}

describe("useGrouping", () => {
  it("is disabled and inert when no config is supplied", () => {
    const { result } = renderHook(() => useGrouping(undefined))
    expect(result.current.enabled).toBe(false)
    expect(result.current.grouping).toEqual([])
    expect(result.current.derivedVisibility).toEqual({})
  })

  it("seeds grouping from `initial` at mount", () => {
    const { result } = renderHook(() => useGrouping(CONFIG))
    expect(result.current.enabled).toBe(true)
    expect(result.current.grouping).toEqual(["stage"])
  })

  it("drops ids that are not declared dimensions", () => {
    const { result } = renderHook(() =>
      useGrouping({ ...CONFIG, initial: ["stage", "not-a-dimension"] }),
    )
    expect(result.current.grouping).toEqual(["stage"])
  })

  it("normalizes on setGrouping too", () => {
    const { result } = renderHook(() => useGrouping(CONFIG))
    act(() => result.current.setGrouping(["owner", "bogus", "stage"]))
    expect(result.current.grouping).toEqual(["owner", "stage"])
  })

  it("hides grouped dimension columns via derivedVisibility", () => {
    const { result } = renderHook(() => useGrouping(CONFIG))
    expect(result.current.derivedVisibility).toEqual({ stage: false })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run components/data-table/use-grouping.test.ts`
Expected: FAIL — cannot resolve `./use-grouping`.

- [ ] **Step 3: Implement the hook**

Create `components/data-table/use-grouping.ts`:

```ts
"use client"

import * as React from "react"
import type {
  ExpandedState,
  OnChangeFn,
  VisibilityState,
} from "@tanstack/react-table"

import { deriveColumnVisibility, normalizeGrouping } from "./grouping-utils"
import type { DataTableGroupingConfig } from "./types"

const EMPTY_GROUPING: string[] = []
const EMPTY_VISIBILITY: VisibilityState = {}

export type UseGroupingResult = {
  enabled: boolean
  grouping: string[]
  setGrouping: (next: string[]) => void
  expanded: ExpandedState
  setExpanded: OnChangeFn<ExpandedState>
  /** Grouped dimension columns hidden so their values show only in the group column. */
  derivedVisibility: VisibilityState
}

/**
 * Grouping + expansion state for DataTable. Returns an inert, stable result when
 * `config` is undefined so a flat table allocates no grouping state and its
 * visibility merge is a no-op.
 */
export function useGrouping<TData>(
  config: DataTableGroupingConfig<TData> | undefined,
): UseGroupingResult {
  const enabled = config != null

  // Key on the dimension IDS, not the config object: consumers routinely pass
  // an inline `grouping={{ ... }}` literal, which is a fresh object every
  // render. Memoizing on its identity would hand a new `setGrouping` and a new
  // `derivedVisibility` to the table on every render.
  const allowedKey = config ? config.dimensions.map((d) => d.id).join(" ") : ""
  const allowedIds = React.useMemo(
    () => (allowedKey === "" ? EMPTY_GROUPING : allowedKey.split(" ")),
    [allowedKey],
  )

  const [grouping, setGroupingState] = React.useState<string[]>(() =>
    config
      ? normalizeGrouping(
          config.initial ?? [],
          config.dimensions.map((d) => d.id),
        )
      : EMPTY_GROUPING,
  )
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  const setGrouping = React.useCallback(
    (next: string[]) => setGroupingState(normalizeGrouping(next, allowedIds)),
    [allowedIds],
  )

  const derivedVisibility = React.useMemo(
    () => (enabled ? deriveColumnVisibility(grouping) : EMPTY_VISIBILITY),
    [enabled, grouping],
  )

  return { enabled, grouping, setGrouping, expanded, setExpanded, derivedVisibility }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm exec vitest run components/data-table/use-grouping.test.ts && pnpm typecheck`
Expected: PASS (5 tests), typecheck silent.

- [ ] **Step 5: Commit**

```bash
git add components/data-table/use-grouping.ts components/data-table/use-grouping.test.ts
git commit -m "feat(data-table): add useGrouping state hook"
```

---

## Task 6: Wire grouping into useDataTable

**Files:**
- Modify: `components/data-table/use-data-table.ts` (options type, table config, nav gate, paste rows, return value)

**Interfaces:**
- Consumes: `useGrouping` (Task 5), `buildGroupColumn` (Task 4), `GROUP_COLUMN_ID` (Task 3).
- Produces: `UseDataTableResult` gains `grouping: string[]`, `setGrouping: (next: string[]) => void`, `isGroupRow: (rowId: string) => boolean`. `UseDataTableOptions` gains `grouping?: DataTableGroupingConfig<TData>`.

- [ ] **Step 1: Write the failing test**

Append to `components/data-table/use-data-table.test.tsx`:

```tsx
describe("grouping", () => {
  const GROUPED_DATA = [
    { id: "1", stage: "won", amount: 10 },
    { id: "2", stage: "won", amount: 20 },
    { id: "3", stage: "lost", amount: 5 },
  ]
  const groupedColumns = [
    { id: "stage", accessorKey: "stage", header: "Stage", enableGrouping: true },
    { id: "amount", accessorKey: "amount", header: "Amount" },
  ]
  const groupingConfig = {
    dimensions: [{ id: "stage", label: "Stage" }],
    initial: ["stage"],
    column: { header: "Deal" },
  }

  function setupGrouped() {
    return renderHook(() =>
      useDataTable({
        data: GROUPED_DATA,
        columns: groupedColumns as never,
        getRowId: (r: { id: string }) => r.id,
        editable: true,
        enablePagination: false,
        grouping: groupingConfig,
      }),
    )
  }

  it("prepends the auto group column when grouping is configured", () => {
    const { result } = setupGrouped()
    expect(result.current.table.getAllColumns()[0].id).toBe("__group__")
  })

  it("does not prepend a group column for a flat table", () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: GROUPED_DATA,
        columns: groupedColumns as never,
        getRowId: (r: { id: string }) => r.id,
        enablePagination: false,
      }),
    )
    expect(
      result.current.table.getAllColumns().some((c) => c.id === "__group__"),
    ).toBe(false)
  })

  it("produces group rows, and reports them via isGroupRow", () => {
    const { result } = setupGrouped()
    const rows = result.current.table.getRowModel().rows
    expect(rows.every((r) => r.getIsGrouped())).toBe(true)
    expect(result.current.isGroupRow(rows[0].id)).toBe(true)
  })

  it("hides the grouped dimension column", () => {
    const { result } = setupGrouped()
    expect(result.current.table.getState().columnVisibility.stage).toBe(false)
  })

  it("never lets a group row enter edit mode", () => {
    const { result } = setupGrouped()
    const groupRowId = result.current.table.getRowModel().rows[0].id
    act(() =>
      result.current.runtime.beginEdit({ rowId: groupRowId, columnId: "amount" }),
    )
    expect(result.current.runtime.editingCell).toBeNull()
  })

  it("still lets a LEAF row inside a group enter edit mode", () => {
    const { result } = setupGrouped()
    // Expand the first group so its leaves join the row model.
    act(() => result.current.table.getRowModel().rows[0].toggleExpanded(true))
    const leaf = result.current.table
      .getRowModel()
      .rows.find((r) => !r.getIsGrouped())
    expect(leaf).toBeDefined()

    act(() =>
      result.current.runtime.beginEdit({ rowId: leaf!.id, columnId: "amount" }),
    )
    expect(result.current.runtime.editingCell).toEqual({
      rowId: leaf!.id,
      columnId: "amount",
    })
  })

  it("Enter on a group row toggles expansion instead of editing", () => {
    const { result } = setupGrouped()
    const groupRow = result.current.table.getRowModel().rows[0]
    expect(groupRow.getIsExpanded()).toBe(false)

    act(() =>
      result.current.runtime.setActiveCell({
        rowId: groupRow.id,
        columnId: "amount",
      }),
    )
    const preventDefault = vi.fn()
    act(() =>
      result.current.runtime.handleKeyDown({
        key: "Enter",
        preventDefault,
      } as unknown as React.KeyboardEvent),
    )

    expect(preventDefault).toHaveBeenCalled()
    expect(result.current.runtime.editingCell).toBeNull()
    expect(
      result.current.table.getRowModel().rows[0].getIsExpanded(),
    ).toBe(true)
  })

  it("excludes group rows from the paste target rows", () => {
    const { result } = setupGrouped()
    // Every top-level row is a group row, so no paste target may match one.
    const groupIds = result.current.table
      .getRowModel()
      .rows.filter((r) => r.getIsGrouped())
      .map((r) => r.id)
    for (const id of groupIds) {
      expect(result.current.isGroupRow(id)).toBe(true)
    }
  })
})
```

Ensure `vi` is imported from `vitest` in this file, and `React` is in scope for the `KeyboardEvent` cast.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx`
Expected: FAIL — `grouping` is not a valid option / `isGroupRow` is not a function.

- [ ] **Step 3: Add the option and result types**

In `components/data-table/use-data-table.ts`, add to `UseDataTableOptions<TData>`:

```ts
  /** Opt-in row grouping. Omit for a flat table (no grouping state, no group column). */
  grouping?: DataTableGroupingConfig<TData>
```

and to `UseDataTableResult<TData>`:

```ts
  /** Current grouping hierarchy (empty when grouping is not configured). */
  grouping: string[]
  /** Sets the hierarchy, normalized against the declared dimensions. */
  setGrouping: (next: string[]) => void
  /** True when `rowId` refers to a synthesized group row rather than a data row. */
  isGroupRow: (rowId: string) => boolean
```

Import the new pieces at the top:

```ts
import { useGrouping } from "./use-grouping"
import { buildGroupColumn } from "./group-column"
import { GROUP_COLUMN_ID, type DataTableGroupingConfig } from "./types"
```

and add `getExpandedRowModel`, `getGroupedRowModel` to the existing `@tanstack/react-table` import.

- [ ] **Step 4: Wire the hook, columns, and table config**

Destructure `grouping: groupingConfig` from the options. Immediately after the existing `useState` block, add:

```ts
  const group = useGrouping(groupingConfig)
```

Replace `resolvedColumns` so the group column is prepended ahead of the gutter.

**Memoize on `column.header`, not on the config object.** Consumers routinely pass an inline literal (`grouping={{ dimensions: [...], column: { leaf: ... } }}`), which is a fresh object every render — depending on its identity would rebuild the whole column array on every render and churn TanStack's internal column state. `buildGroupColumn` only reads `config.header`, so that is the only real dependency. This mirrors the precedent already set in `use-grouped-table.ts`, whose `groupColumnDef` memo carries a comment explaining exactly this hazard.

```ts
  const groupColumnHeader = groupingConfig?.column.header
  const groupingEnabled = groupingConfig != null
  const resolvedColumns = React.useMemo(() => {
    const base = enableRowSelection ? [buildRowGutterColumn<TData>(), ...columns] : columns
    if (!groupingEnabled) return base
    return [buildGroupColumn<TData>({ header: groupColumnHeader }), ...base]
    // `groupColumnHeader` is the only field buildGroupColumn reads; depending on
    // the whole config object would rebuild this array on every render for
    // consumers passing an inline literal.
  }, [enableRowSelection, columns, groupingEnabled, groupColumnHeader])
```

The rest of the group config (`leaf`/`renderLeaf`/`countMode`/`indentSize`) is consumed at render time by `GroupAwareCell` in Task 7, not baked into the column def — so an inline literal stays correct there while costing nothing here.

Merge visibility — user toggles first, derived grouping visibility wins:

```ts
  // Grouped dimension columns must stay hidden regardless of what the user
  // toggled in the Columns menu, so the derived map is spread last.
  const effectiveColumnVisibility = React.useMemo(
    () => ({ ...columnVisibility, ...group.derivedVisibility }),
    [columnVisibility, group.derivedVisibility],
  )
```

In the `useReactTable` call, use `effectiveColumnVisibility` in `state.columnVisibility`, and add grouping state + row models + sub-row selection **only when grouping is enabled**, so the flat path is untouched:

```ts
    state: {
      sorting,
      columnVisibility: effectiveColumnVisibility,
      columnPinning,
      columnSizing,
      rowSelection,
      ...(group.enabled ? { grouping: group.grouping, expanded: group.expanded } : {}),
      ...(enablePagination ? { pagination } : {}),
    },
```

```ts
    ...(group.enabled
      ? {
          onGroupingChange: (updater) =>
            group.setGrouping(
              typeof updater === "function" ? updater(group.grouping) : updater,
            ),
          onExpandedChange: group.setExpanded,
          getGroupedRowModel: getGroupedRowModel(),
          getExpandedRowModel: getExpandedRowModel(),
          enableSubRowSelection: true,
          paginateExpandedRows: false,
          autoResetExpanded: false,
        }
      : {}),
```

- [ ] **Step 5: Add `isGroupRow`, gate editing, and make paste leaf-only**

After `const rows = table.getRowModel().rows`, add:

```ts
  // Group rows carry TanStack-synthesised ids (e.g. "stage:won"), never TData
  // ids — they must never reach updateData. A Set keeps the lookup O(1) and
  // avoids table.getRow() throwing on an id that has since disappeared.
  const groupRowIds = React.useMemo(
    () => new Set(rows.filter((r) => r.getIsGrouped()).map((r) => r.id)),
    [rows],
  )
  const isGroupRow = React.useCallback(
    (rowId: string) => groupRowIds.has(rowId),
    [groupRowIds],
  )
```

Update the per-cell gate added in Task 2:

```ts
  const isCellEditable = React.useCallback(
    (pos: CellPos) => isColumnEditable(pos.columnId) && !isGroupRow(pos.rowId),
    [isColumnEditable, isGroupRow],
  )
```

Make paste target only leaf rows:

```ts
  const prePaginationRows = table.getPrePaginationRowModel().rows
  const pasteRowIds = React.useMemo(
    // Leaf rows only: a paste block must never target a synthesized group row.
    // With grouping off, every row is a leaf, so this is identical to before.
    () => prePaginationRows.filter((r) => !r.getIsGrouped()).map((r) => r.id),
    [prePaginationRows],
  )
```

- [ ] **Step 6: Make `Enter` toggle expansion on a group row**

`useGridNavigation` stays pure — compose instead. Immediately after `const nav = useGridNavigation({...})`:

```ts
  // Enter on a group row toggles expansion instead of entering edit mode
  // (isCellEditable already refuses to edit it). Composed here rather than
  // taught to useGridNavigation, which is deliberately table-agnostic.
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (
        e.key === "Enter" &&
        nav.activeCell &&
        !nav.editingCell &&
        isGroupRow(nav.activeCell.rowId)
      ) {
        table.getRow(nav.activeCell.rowId)?.toggleExpanded()
        e.preventDefault()
        return
      }
      nav.handleKeyDown(e)
    },
    [nav, isGroupRow, table],
  )
```

Then in the object assembled for `DataTableRuntime`, replace `handleKeyDown: nav.handleKeyDown` with `handleKeyDown`.

Finally, add to the hook's return statement:

```ts
    grouping: group.grouping,
    setGrouping: group.setGrouping,
    isGroupRow,
```

- [ ] **Step 7: Run the full suite**

Run: `pnpm exec vitest run && pnpm typecheck`
Expected: all pass. The five new grouping tests pass; **every pre-existing test still passes** — that is the flat-path guarantee.

- [ ] **Step 8: Commit**

```bash
git add components/data-table/use-data-table.ts components/data-table/use-data-table.test.tsx
git commit -m "feat(data-table): wire opt-in grouping into useDataTable"
```

---

## Task 7: Render grouping in DataTable

**Files:**
- Modify: `components/data-table/data-table.tsx`

**Interfaces:**
- Consumes: `useDataTable`'s `grouping`/`setGrouping` (Task 6), `GroupAwareCell` (Task 4).
- Produces: `DataTableProps<TData>` gains `grouping?: DataTableGroupingConfig<TData>`.

- [ ] **Step 1: Write the failing test**

Append to `components/data-table/data-table.test.tsx`:

```tsx
describe("grouping", () => {
  const DEALS = [
    { id: "1", stage: "won", amount: 10 },
    { id: "2", stage: "won", amount: 20 },
    { id: "3", stage: "lost", amount: 5 },
  ]
  const cols = [
    { id: "stage", accessorKey: "stage", header: "Stage", enableGrouping: true },
    { id: "amount", accessorKey: "amount", header: "Amount" },
  ]

  it("renders group rows with label, count, and an expand control", () => {
    render(
      <DataTable
        data={DEALS}
        columns={cols as never}
        getRowId={(r: { id: string }) => r.id}
        enablePagination={false}
        grouping={{
          dimensions: [{ id: "stage", label: "Stage" }],
          initial: ["stage"],
          column: { header: "Deal", leaf: { primary: (r) => r.original.id } },
        }}
      />,
    )
    expect(screen.getByText("won")).toBeInTheDocument()
    expect(screen.getByText("(2)")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Expand group" })).toHaveLength(2)
  })

  it("renders the grouping control from renderControl", () => {
    render(
      <DataTable
        data={DEALS}
        columns={cols as never}
        getRowId={(r: { id: string }) => r.id}
        enablePagination={false}
        grouping={{
          dimensions: [{ id: "stage", label: "Stage" }],
          initial: ["stage"],
          column: { header: "Deal" },
          renderControl: ({ grouping }) => (
            <div data-testid="control">grouped by {grouping.join(",")}</div>
          ),
        }}
      />,
    )
    expect(screen.getByTestId("control")).toHaveTextContent("grouped by stage")
  })

  it("renders no group column for a flat table", () => {
    render(
      <DataTable
        data={DEALS}
        columns={cols as never}
        getRowId={(r: { id: string }) => r.id}
        enablePagination={false}
      />,
    )
    expect(screen.queryByRole("button", { name: "Expand group" })).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run components/data-table/data-table.test.tsx`
Expected: FAIL — `grouping` is not a valid prop.

- [ ] **Step 3: Add the prop and thread the hook result**

In `components/data-table/data-table.tsx`, add to `DataTableProps<TData>`:

```ts
  /** Opt-in row grouping. Omit for a flat table. */
  grouping?: DataTableGroupingConfig<TData>
```

Import `GroupAwareCell` from `./group-cell` and `DataTableGroupingConfig` from `./types`, and destructure the new hook fields:

```ts
  const { table, runtime, filterState, setFilterState, grouping, setGrouping } =
    useDataTable(props)
```

- [ ] **Step 4: Render the grouping control in the toolbar**

Inside the existing left-hand toolbar `<div className="flex items-center gap-2">`, after `<ActionsMenu ... />`, add:

```tsx
            {props.grouping?.renderControl?.({
              dimensions: props.grouping.dimensions,
              grouping,
              setGrouping,
            })}
```

- [ ] **Step 5: Branch cell rendering when grouping is on**

Replace the body-cell render inside `<TableCell>`:

```tsx
                          {props.grouping ? (
                            <GroupAwareCell
                              cell={cell}
                              groupColumn={props.grouping.column}
                            />
                          ) : (
                            flexRender(cell.column.columnDef.cell, cell.getContext())
                          )}
```

The explicit branch keeps the flat path byte-identical rather than routing it through a helper that would merely fall through.

- [ ] **Step 6: Run the full suite**

Run: `pnpm exec vitest run && pnpm typecheck && pnpm exec eslint components/data-table`
Expected: all pass, eslint silent.

- [ ] **Step 7: Commit**

```bash
git add components/data-table/data-table.tsx components/data-table/data-table.test.tsx
git commit -m "feat(data-table): render grouping (group cells + toolbar control slot)"
```

---

## Task 8: Make the gutter, footer, and export leaf-aware

**Files:**
- Modify: `components/data-table/row-gutter.tsx:73-154`
- Modify: `components/data-table/row-gutter.radix.tsx` (mirror the same edits)
- Modify: `components/data-table/row-gutter.test.tsx` (stub helpers + 3 new tests)
- Modify: `components/data-table/use-footer-aggregation.ts:59`
- Modify: `components/data-table/use-footer-aggregation.test.ts` (1 new test)
- Modify: `components/data-table/data-table.tsx` (`ExportCsvButton`, ~lines 152-156)

**Interfaces:**
- Consumes: nothing new.
- Produces: no signature changes — behavioural only.

- [ ] **Step 1: Teach the row-gutter test stubs about grouping**

`mockRow` and `mockTable` in `components/data-table/row-gutter.test.tsx` return bare objects with no `getIsGrouped`, so the leaf filter added in Step 3 would throw `TypeError: r.getIsGrouped is not a function` across every existing gutter test. Model the real `Row` API first (helpers only — **no assertion changes**).

In `mockRow`, add the parameter and the method:

```ts
function mockRow({ id = "r0", index = 0, selected = false, grouped = false } = {}) {
  return {
    id,
    index,
    getIsSelected: () => selected,
    getIsSomeSelected: () => false,
    getIsAllSubRowsSelected: () => false,
    getIsGrouped: () => grouped,
    toggleSelected: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}
```

In `mockTable`, default every entry of `rows` to a non-group row so the existing `rows: [{}, {}, {...row}]` call sites keep working:

```ts
    // Rows are stubbed as bare objects by most callers; normalise them so the
    // production leaf filter (`!r.getIsGrouped()`) can run against them.
    getRowModel: () => ({
      rows: (rows as Record<string, unknown>[]).map((r) => ({
        getIsGrouped: () => false,
        ...r,
      })),
    }),
```

- [ ] **Step 2: Write the failing tests**

Append to `components/data-table/row-gutter.test.tsx`:

```tsx
it("numbers leaf rows by their position among leaves, skipping group rows", () => {
  const column = buildRowGutterColumn<{ id: string }>()
  // Model: [group, leaf, leaf("r2")] — "r2" is the 2nd LEAF, so it renders "2",
  // not "3" (its raw index in the row model).
  const row = mockRow({ id: "r2", index: 99 })
  const table = mockTable({
    rows: [
      { id: "g1", getIsGrouped: () => true },
      { id: "r1", getIsGrouped: () => false },
      { id: "r2", getIsGrouped: () => false },
    ],
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = { table, row, column } as any

  render(
    <DataTableRuntimeContext.Provider value={stubRuntime()}>
      {flexRender(column.cell, ctx)}
    </DataTableRuntimeContext.Provider>,
  )
  expect(screen.getByText("2")).toBeInTheDocument()
  expect(screen.queryByText("3")).toBeNull()
})

it("renders no row number on a group row", () => {
  const column = buildRowGutterColumn<{ id: string }>()
  const row = mockRow({ id: "g1", grouped: true })
  const table = mockTable({ rows: [{ id: "g1", getIsGrouped: () => true }] })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = { table, row, column } as any

  const { container } = render(
    <DataTableRuntimeContext.Provider value={stubRuntime()}>
      {flexRender(column.cell, ctx)}
    </DataTableRuntimeContext.Provider>,
  )
  expect(container.querySelector(".tabular-nums")).toBeNull()
  expect(screen.getByRole("checkbox")).toBeInTheDocument()
})

it("shows a group row's checkbox as indeterminate when only some descendants are selected", () => {
  const column = buildRowGutterColumn<{ id: string }>()
  const row = {
    ...mockRow({ id: "g1", grouped: true }),
    getIsSomeSelected: () => true,
    getIsAllSubRowsSelected: () => false,
  }
  const table = mockTable({ rows: [{ id: "g1", getIsGrouped: () => true }] })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = { table, row, column } as any

  render(
    <DataTableRuntimeContext.Provider value={stubRuntime()}>
      {flexRender(column.cell, ctx)}
    </DataTableRuntimeContext.Provider>,
  )
  expect(screen.getByRole("checkbox")).toHaveAttribute("data-indeterminate", "true")
})
```

> If the shared `Checkbox` primitive does not set `data-indeterminate`, assert on whatever the existing `SelectAllHeader` indeterminate test in this same file asserts on — reuse that exact query so both tests stay consistent.

Append to `components/data-table/use-footer-aggregation.test.ts` (this file builds a **real** TanStack table via `useTestTable`, so rows already have `getIsGrouped`):

```ts
it("excludes group rows so a grouped selection is not double-counted", () => {
  // With grouping on, getSelectedRowModel().flatRows contains BOTH the group
  // row (whose getValue() is the rolled-up sum of its children) and those
  // children. Counting both would add the subtotal on top of its own parts.
  const { result } = renderHook(() =>
    useTestTableWithGrouping(),
  )
  const total = result.current.aggregate("amount", "sum")
  const leafSum = DATA.reduce((n, r) => n + r.amount, 0)
  expect(total).toBe(leafSum)
})
```

> Build `useTestTableWithGrouping` by copying `useTestTable` and adding `grouping`/`getGroupedRowModel` per Task 6, selecting all rows. The assertion that matters: **the total equals the sum of leaf values, not double that.**

- [ ] **Step 3: Run to verify they fail**

Run: `pnpm exec vitest run components/data-table/row-gutter.test.tsx components/data-table/use-footer-aggregation.test.ts`
Expected: FAIL on the three new gutter tests and the new footer test. **Every pre-existing test in both files must still pass** — if Step 1's stub change broke one, fix the stub before continuing.

- [ ] **Step 4: Update `row-gutter.tsx`**

In `RowGutterCell`, replace the `displayIndex`/`rowNumber` computation:

```ts
  // Number leaf rows by their position among LEAF rows: with grouping on the
  // row model interleaves group rows, so counting raw model position would
  // skip numbers. With grouping off every row is a leaf and this is unchanged.
  const isGroupRow = row.getIsGrouped()
  const leafRows = table.getRowModel().rows.filter((r) => !r.getIsGrouped())
  const displayIndex = leafRows.findIndex((r) => r.id === row.id)
  const rowNumber = pageIndex * pageSize + displayIndex + 1
```

Make the checkbox tri-state on group rows (with `enableSubRowSelection`, a parent is "selected" only when all descendants are):

```ts
  // A group row summarises its descendants: checked only when all of them are
  // selected, indeterminate while only some are.
  const groupIndeterminate = isGroupRow && !selected && row.getIsSomeSelected()
```

Replace the number `<span>` so group rows render none:

```tsx
      {isGroupRow ? null : (
        <span className={cn("tabular-nums", numberHiddenClass)}>{rowNumber}</span>
      )}
```

Keep a group row's checkbox always visible (there is no number to swap with):

```ts
  const checkboxWrapperClass =
    selected || isGroupRow
      ? "inline-flex"
      : "hidden [tr:hover_&]:inline-flex group-focus-within:inline-flex"
```

Pass the indeterminate state to the `Checkbox` and fix the labels so group rows never claim a row number:

```tsx
        <Checkbox
          checked={selected}
          indeterminate={groupIndeterminate}
          onPointerDown={(e) => {
            shiftKeyRef.current = e.shiftKey
          }}
          onKeyDown={(e) => {
            shiftKeyRef.current = e.shiftKey
          }}
          onCheckedChange={(checked) => {
            runtime?.toggleRowSelected(row.id, checked === true, shiftKeyRef.current)
          }}
          aria-label={
            isGroupRow
              ? selected
                ? "Deselect group"
                : "Select group"
              : selected
                ? `Deselect row ${rowNumber}`
                : `Select row ${rowNumber}`
          }
        />
```

and on the wrapper div:

```tsx
      aria-label={selected || isGroupRow ? undefined : `Row ${rowNumber}`}
```

- [ ] **Step 5: Mirror the identical edits into `row-gutter.radix.tsx`**

Apply the same changes to that file's `RowGutterCell`. Per that file's own header comment, only `SelectAllHeader`'s checked/indeterminate wiring differs between the builds — `RowGutterCell` is otherwise identical.

Verify they stayed identical:

```bash
diff <(sed -n '/function RowGutterCell/,/^}/p' components/data-table/row-gutter.tsx) \
     <(sed -n '/function RowGutterCell/,/^}/p' components/data-table/row-gutter.radix.tsx)
```

Expected: no output.

> If the Radix `Checkbox` has no `indeterminate` prop, mirror whatever pattern `SelectAllHeader` already uses in `row-gutter.radix.tsx` for its own indeterminate state rather than inventing a new one.

- [ ] **Step 6: Make footer aggregation leaf-only**

In `components/data-table/use-footer-aggregation.ts`, replace the `selectedRows`/`scopeRows`/`loadedRowCount` block (around line 59):

```ts
  // Leaf rows only, on every scope. TanStack's pipeline puts grouping BEFORE
  // sorting, so both the selected and the sorted models surface group rows at
  // top level — and a group row's getValue() is the rolled-up aggregate of the
  // very children sitting beside it, so counting both double-counts. Flat
  // tables have no sub-rows, so flatRows equals rows and this is a no-op there.
  const isLeaf = (r: { getIsGrouped: () => boolean }) => !r.getIsGrouped()
  const selectedRows = table.getSelectedRowModel().flatRows.filter(isLeaf)
  const scopeIsSelection = isAllMatchingSelected || selectedRows.length > 0
  const sortedLeafRows = table.getSortedRowModel().flatRows.filter(isLeaf)
  const scopeRows = scopeIsSelection ? selectedRows : sortedLeafRows

  const loadedRowCount = sortedLeafRows.length
```

- [ ] **Step 7: Make CSV export leaf-only**

`ExportCsvButton` in `components/data-table/data-table.tsx` (around lines 152-156) sources `table.getSortedRowModel().rows` and `table.getSelectedRowModel().rows`, both of which include group rows once grouping is on. Apply the same filter:

```ts
    const isLeaf = (r: { getIsGrouped: () => boolean }) => !r.getIsGrouped()
    const sortedRows = table.getSortedRowModel().flatRows.filter(isLeaf)
    const hasSelection =
      table.getSelectedRowModel().flatRows.filter(isLeaf).length > 0
```

Leave the rest of that function unchanged, and update any later `getSelectedRowModel().rows` reference inside it to the same filtered list.

- [ ] **Step 8: Run the full suite**

Run: `pnpm exec vitest run && pnpm typecheck && pnpm exec eslint components/data-table`
Expected: all pass, eslint silent.

- [ ] **Step 9: Commit**

```bash
git add components/data-table/row-gutter.tsx components/data-table/row-gutter.radix.tsx components/data-table/row-gutter.test.tsx components/data-table/use-footer-aggregation.ts components/data-table/use-footer-aggregation.test.ts components/data-table/data-table.tsx
git commit -m "fix(data-table): make gutter, footer aggregation, and CSV export leaf-aware"
```

---

## Task 9: Extract `dimension-picker` as its own registry item

`dimension-picker.tsx` is the **only** dnd-kit importer in the repo (4 npm packages for one file). Splitting it keeps `data-table`'s dependency list unchanged. It imports `MultiSelect`, `PopoverButtonTrigger`, and `DimensionDef` — all of which it now takes from `data-table` rather than carrying duplicate copies.

**Files:**
- Create: `components/dimension-picker/dimension-picker.tsx`
- Create: `components/dimension-picker/index.ts`
- Create: `components/dimension-picker/dimension-picker.test.tsx`

**Interfaces:**
- Consumes: `MultiSelect`, `PopoverButtonTrigger`, `type DimensionDef` from `@/components/data-table`.
- Produces: `DimensionPicker`, `DimensionPickerContent`, `reorderGrouping`.

- [ ] **Step 1: Confirm data-table re-exports what the picker needs**

Run: `grep -nE "MultiSelect|PopoverButtonTrigger|DimensionDef" components/data-table/index.ts`
Expected: `MultiSelect` and `PopoverButtonTrigger` are exported. If either is missing, add it to `components/data-table/index.ts`:

```ts
export { MultiSelect, MultiSelectContent, multiSelectLabel } from "./multi-select"
export { PopoverButtonTrigger } from "./primitives"
```

Also ensure the Task 3 grouping types are exported there:

```ts
export {
  GROUP_COLUMN_ID,
  type DimensionDef,
  type GroupLeafConfig,
  type GroupColumnConfig,
  type DataTableGroupingConfig,
} from "./types"
```

- [ ] **Step 2: Move the picker and its test**

```bash
mkdir -p components/dimension-picker
git mv components/grouped-data-table/dimension-picker.tsx components/dimension-picker/dimension-picker.tsx
git mv components/grouped-data-table/dimension-picker.test.tsx components/dimension-picker/dimension-picker.test.tsx
```

- [ ] **Step 3: Repoint its imports**

In `components/dimension-picker/dimension-picker.tsx`, replace the three local imports:

```ts
import type { DimensionDef } from "./types"
import { MultiSelect } from "./multi-select"
import { PopoverButtonTrigger } from "./primitives"
```

with:

```ts
import {
  MultiSelect,
  PopoverButtonTrigger,
  type DimensionDef,
} from "@/components/data-table"
```

In `components/dimension-picker/dimension-picker.test.tsx`, update the import of the component under test to `./dimension-picker` (unchanged) and any `DimensionDef` import to `@/components/data-table`.

- [ ] **Step 4: Add the barrel**

Create `components/dimension-picker/index.ts`:

```ts
export {
  DimensionPicker,
  DimensionPickerContent,
  reorderGrouping,
} from "./dimension-picker"
```

- [ ] **Step 5: Verify the compatibility suite still passes unmodified**

Run: `pnpm exec vitest run components/dimension-picker && pnpm typecheck`
Expected: PASS. The only edits to `dimension-picker.test.tsx` are import paths — **no assertion may change.**

- [ ] **Step 6: Commit**

```bash
git add components/dimension-picker components/data-table/index.ts
git commit -m "refactor: extract dimension-picker into its own item so data-table needs no dnd-kit"
```

---

## Task 10: Reduce GroupedDataTable to a wrapper and delete the duplication

**Files:**
- Rewrite: `components/grouped-data-table/grouped-data-table.tsx`
- Rewrite: `components/grouped-data-table/use-grouped-table.ts`
- Rewrite: `components/grouped-data-table/types.ts`
- Rewrite: `components/grouped-data-table/index.ts`
- Delete: `filter-utils.ts`, `filter-utils.test.ts`, `filter-builder.tsx`, `filter-builder.test.tsx`, `multi-select.tsx`, `multi-select.test.tsx`, `primitives.tsx`, `primitives.radix.tsx`, `primitives.test.tsx`, `primitives.parity.test.ts`, `cross-family-parity.test.ts`, `grouping-utils.ts`, `grouping-utils.test.ts`, `group-cell.tsx` — all under `components/grouped-data-table/`

**Interfaces:**
- Consumes: `DataTable`, `useDataTable`, `GroupAwareCell`, grouping types from `@/components/data-table`; `DimensionPicker` from `@/components/dimension-picker`.
- Produces: unchanged public surface — `GroupedDataTable`, `useGroupedTable`, `GroupCell`, `GROUP_COLUMN_ID`, filter types/utils, `MultiSelect`, `DimensionPicker`.

- [ ] **Step 1: Rewrite the component as a wrapper**

Replace the whole of `components/grouped-data-table/grouped-data-table.tsx`:

```tsx
"use client"

import { DataTable } from "@/components/data-table"
import { DimensionPicker } from "@/components/dimension-picker"

import type { GroupedDataTableProps } from "./types"

/**
 * @deprecated Use `DataTable` with its `grouping` prop. This wrapper exists for
 * one migration release and will be removed — see
 * docs/superpowers/specs/2026-07-20-unified-data-table-grouping-design.md.
 */
export function GroupedDataTable<TData>(props: GroupedDataTableProps<TData>) {
  return (
    <DataTable<TData>
      data={props.data}
      columns={props.columns}
      enablePagination={props.enablePagination ?? true}
      enableExport={false}
      filterableColumns={props.filterableColumns}
      initialFilterState={props.initialFilterState}
      grouping={{
        dimensions: props.groupableDimensions,
        initial: props.initialGrouping,
        column: props.groupColumn,
        renderControl: ({ dimensions, grouping, setGrouping }) => (
          <DimensionPicker
            dimensions={dimensions}
            grouping={grouping}
            onGroupingChange={setGrouping}
          />
        ),
      }}
    />
  )
}
```

- [ ] **Step 2: Rewrite `use-grouped-table.ts` as an adapter**

`use-grouped-table.test.tsx` is a compatibility suite, so the hook keeps its exact return shape:

```ts
"use client"

import { useDataTable } from "@/components/data-table"
import type { Table } from "@tanstack/react-table"

import type { GroupedDataTableProps } from "./types"
import type { FilterState } from "./types"

export type UseGroupedTableResult<TData> = {
  table: Table<TData>
  grouping: string[]
  setGrouping: (next: string[]) => void
  filterState: FilterState
  setFilterState: (next: FilterState | ((prev: FilterState) => FilterState)) => void
}

/**
 * @deprecated Use `useDataTable` with its `grouping` option. Thin adapter kept
 * for one migration release.
 */
export function useGroupedTable<TData>(
  props: GroupedDataTableProps<TData>,
): UseGroupedTableResult<TData> {
  const { table, grouping, setGrouping, filterState, setFilterState } = useDataTable<TData>({
    data: props.data,
    columns: props.columns,
    enablePagination: props.enablePagination ?? true,
    filterableColumns: props.filterableColumns,
    initialFilterState: props.initialFilterState,
    grouping: {
      dimensions: props.groupableDimensions,
      initial: props.initialGrouping,
      column: props.groupColumn,
    },
  })
  return { table, grouping, setGrouping, filterState, setFilterState }
}
```

- [ ] **Step 3: Re-point `types.ts` at data-table**

Replace `components/grouped-data-table/types.ts` so it re-exports rather than redeclares — this is what removes the duplicated 42-line filter block:

```ts
import type { ColumnDef } from "@tanstack/react-table"

export {
  GROUP_COLUMN_ID,
  type DimensionDef,
  type GroupLeafConfig,
  type GroupColumnConfig,
  type FilterType,
  type FilterOperator,
  type FilterDef,
  type FilterValue,
  type FilterCondition,
  type Combinator,
  type FilterGroup,
  type FilterState,
} from "@/components/data-table"

import type { DimensionDef, GroupColumnConfig, FilterDef, FilterState } from "@/components/data-table"

/** @deprecated Use `DataTableProps` with its `grouping` config. */
export type GroupedDataTableProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  groupableDimensions: DimensionDef[]
  groupColumn: GroupColumnConfig<TData>
  initialGrouping?: string[]
  enablePagination?: boolean
  filterableColumns?: FilterDef[]
  initialFilterState?: FilterState
}
```

- [ ] **Step 4: Re-point `index.ts` at the new homes**

Replace `components/grouped-data-table/index.ts`:

```ts
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
```

> If `components/data-table/index.ts` does not already export every filter symbol listed above, add the missing ones there — it owns them now. Verify with `pnpm typecheck`.

- [ ] **Step 5: Delete the duplicated files**

```bash
git rm components/grouped-data-table/filter-utils.ts \
       components/grouped-data-table/filter-utils.test.ts \
       components/grouped-data-table/filter-builder.tsx \
       components/grouped-data-table/filter-builder.test.tsx \
       components/grouped-data-table/multi-select.tsx \
       components/grouped-data-table/multi-select.test.tsx \
       components/grouped-data-table/primitives.tsx \
       components/grouped-data-table/primitives.radix.tsx \
       components/grouped-data-table/primitives.test.tsx \
       components/grouped-data-table/primitives.parity.test.ts \
       components/grouped-data-table/cross-family-parity.test.ts \
       components/grouped-data-table/grouping-utils.ts \
       components/grouped-data-table/grouping-utils.test.ts \
       components/grouped-data-table/group-cell.tsx
```

`group-cell.test.tsx` stays — it is a compatibility suite. Update only its import to `@/components/data-table` (the `GroupCell` alias re-export above keeps its assertions valid).

- [ ] **Step 6: Run the compatibility gate**

Run: `pnpm exec vitest run components/grouped-data-table && pnpm typecheck`
Expected: `grouped-data-table.test.tsx`, `use-grouped-table.test.tsx`, and `group-cell.test.tsx` all PASS **with no assertion changed**.

If any assertion needs changing to pass, **stop and flag it** — per the Global Constraints that is a regression, not a test update.

- [ ] **Step 7: Run everything**

Run: `pnpm exec vitest run && pnpm typecheck && pnpm exec eslint components`
Expected: all pass. Total test count drops (duplicated suites removed); no failures.

- [ ] **Step 8: Verify the duplication is actually gone**

```bash
for f in filter-utils.ts filter-builder.tsx multi-select.tsx primitives.tsx primitives.radix.tsx; do
  test -e "components/grouped-data-table/$f" && echo "STILL DUPLICATED: $f"
done; echo "duplication check complete"
```

Expected: only `duplication check complete`.

- [ ] **Step 9: Commit**

```bash
git add -A components/grouped-data-table
git commit -m "refactor: reduce GroupedDataTable to a wrapper over DataTable's grouping"
```

---

## Task 11: Registry, docs, and demo updates

**Files:**
- Modify: `registry.json`
- Modify: `components/site/crm-block.tsx`, `app/docs/blocks/crm/page.tsx`
- Modify: `app/docs/grouping/page.tsx`
- Modify: `README.md`

- [ ] **Step 1: Update `registry.json`**

Three edits:

1. **`data-table` and `data-table-radix`** — add the new files to their `files` arrays (`grouping-utils.ts` as `registry:lib`, `use-grouping.ts` as `registry:hook`, `group-column.tsx` and `group-cell.tsx` as `registry:component`), each with matching `path`/`target`. Dependencies stay `["@tanstack/react-table","lucide-react","sonner"]` — **do not add dnd-kit.**

2. **New `dimension-picker` and `dimension-picker-radix` items:**

```json
{
  "name": "dimension-picker",
  "type": "registry:block",
  "title": "Dimension Picker",
  "description": "Drag-and-drop grouping hierarchy picker for Data Table's `grouping.renderControl` slot. Optional — install only if you want users to change grouping at runtime.",
  "dependencies": [
    "@dnd-kit/core",
    "@dnd-kit/sortable",
    "@dnd-kit/modifiers",
    "@dnd-kit/utilities",
    "lucide-react"
  ],
  "registryDependencies": ["@kotsas-ui/data-table", "badge", "popover"],
  "files": [
    {
      "path": "components/dimension-picker/dimension-picker.tsx",
      "type": "registry:component",
      "target": "components/dimension-picker/dimension-picker.tsx"
    },
    {
      "path": "components/dimension-picker/index.ts",
      "type": "registry:lib",
      "target": "components/dimension-picker/index.ts"
    }
  ]
}
```

3. **`grouped-data-table` / `grouped-data-table-radix`** — replace `files` with just the four wrapper files (`grouped-data-table.tsx`, `use-grouped-table.ts`, `types.ts`, `index.ts`), set `registryDependencies` to `["@kotsas-ui/data-table", "@kotsas-ui/dimension-picker"]`, drop all dnd-kit entries from `dependencies` (the picker item owns them now), and prefix the description with `DEPRECATED — use @kotsas-ui/data-table's grouping prop. `.

- [ ] **Step 2: Rebuild and verify the registry**

Run: `pnpm registry:build`
Then verify no dnd-kit leaked into data-table:

```bash
node -e "
const d=require('./public/r/registry.json');
const dt=d.items.find(i=>i.name==='data-table');
if (JSON.stringify(dt.dependencies).includes('dnd-kit')) { console.error('FAIL: dnd-kit leaked into data-table'); process.exit(1) }
console.log('OK: data-table deps =', dt.dependencies.join(', '));
console.log('items:', d.items.map(i=>i.name).join(', '));
"
```

Expected: `OK: data-table deps = @tanstack/react-table, lucide-react, sonner` and 7 items listed.

- [ ] **Step 3: Migrate the CRM Pipeline block to the new API**

In `components/site/crm-block.tsx`, replace the `<GroupedDataTable ... />` usage with `<DataTable ... grouping={{ dimensions: groupableDimensions, initial: ["stage"], column: groupColumn, renderControl: ... }} />`, importing `DataTable` from `@/components/data-table` and `DimensionPicker` from `@/components/dimension-picker`. Mirror the identical change into the `PIPELINE_CODE` string in `app/docs/blocks/crm/page.tsx` so the shown code matches what runs.

- [ ] **Step 4: Update the grouping docs page**

In `app/docs/grouping/page.tsx`: change `<InstallTabs package="@kotsas-ui/grouped-data-table" />` to `<InstallTabs package="@kotsas-ui/data-table" />`, add a second `<InstallTabs package="@kotsas-ui/dimension-picker" />` noting it is optional, update `<WorksWith components={["grouped-data-table"]} />` to `["data-table"]`, and update the page's code samples to the `grouping` prop form.

- [ ] **Step 5: Update the README**

Replace the `grouped-data-table` install snippet with `data-table`, and add a short "Grouping" section showing the `grouping` prop. Note that `@kotsas-ui/grouped-data-table` is deprecated.

- [ ] **Step 6: Verify the whole app still builds**

Run: `pnpm exec vitest run && pnpm typecheck && pnpm exec eslint . && pnpm build`
Expected: all pass; build prerenders all routes.

- [ ] **Step 7: Manual smoke check**

Run `pnpm dev`, then confirm in a browser:
- `/accounts` — grouping, expand/collapse, and the dimension picker all still work.
- `/docs/blocks/crm` — the Pipeline block renders grouped with per-group value subtotals.
- `/docs/grouping` — the demo works and the install command reads `@kotsas-ui/data-table`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: publish dimension-picker item, migrate demos and docs to DataTable grouping"
```

---

## Task 12: Rename the repo to `kotsas-ui` (spec decision 1 — independent)

Independent of Tasks 1–11 and safe to skip or defer. Done last because renaming the GitHub repo mid-plan would break the `origin` remote for earlier tasks.

**Files:**
- Modify: `package.json`, `components/site/github-stars.tsx`, `registry.json`, `README.md`
- Regenerate: `public/r/registry.json`

- [ ] **Step 1: Rename on GitHub**

In the GitHub UI: Settings → Repository name → `kotsas-ui` → Rename. GitHub keeps a redirect, so existing clones and the raw-URL install path keep working.

- [ ] **Step 2: Update the local remote**

```bash
git remote set-url origin https://github.com/gianniskotsas/kotsas-ui.git
git remote -v
```

Expected: both fetch and push show `kotsas-ui`.

- [ ] **Step 3: Update the four source references**

```bash
sed -i.bak 's/"name": "react-pivot-table"/"name": "kotsas-ui"/' package.json
sed -i.bak 's|gianniskotsas/react-pivot-table|gianniskotsas/kotsas-ui|g' components/site/github-stars.tsx registry.json README.md
sed -i.bak 's|https://react-pivot-table.vercel.app|https://kotsas-ui.vercel.app|g' README.md
rm -f package.json.bak components/site/github-stars.tsx.bak registry.json.bak README.md.bak
```

- [ ] **Step 4: Confirm only live config changed**

```bash
grep -rn "react-pivot-table" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v "^./docs/superpowers/" | grep -v "^./pnpm-lock"
```

Expected: **no output.** Matches remaining under `docs/superpowers/` are dated historical records and are deliberately left alone.

- [ ] **Step 5: Regenerate the built registry**

Run: `pnpm registry:build`
Then: `grep -c "gianniskotsas/kotsas-ui" public/r/registry.json`
Expected: at least 1. Never hand-edit `public/r/registry.json`.

- [ ] **Step 6: Verify and commit**

Run: `pnpm exec vitest run && pnpm typecheck && pnpm build`
Expected: all pass.

```bash
git add -A
git commit -m "chore: rename project to kotsas-ui"
```

- [ ] **Step 7: Update the Vercel project**

In the Vercel dashboard, rename the project to `kotsas-ui` and update the production domain. Then confirm the README's live-demo link resolves.

---

## Out of scope for this plan

**Spec Phase 3 (removing `GroupedDataTable`).** Requires a shipped migration release first. When that window closes: delete `components/grouped-data-table/`, its registry items, and the deprecation notes — a small, mechanical follow-up plan.
