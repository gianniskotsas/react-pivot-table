# GroupedDataTable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, strongly typed `GroupedDataTable<TData>` that renders AG-Grid-style multi-level row grouping in a single auto "Group" column, with a drag-and-drop dimension picker.

**Architecture:** A single `<GroupedDataTable>` client component backed by an internal headless hook `useGroupedTable` (also exported). The hook owns the TanStack Table v8 instance and all state (grouping, expanded, sorting, filters, pagination), synthesizes the auto group column, and derives column visibility to hide grouped dimensions. Rendering uses shadcn/ui table primitives. The dimension picker uses `@dnd-kit` for hierarchy reordering.

**Tech Stack:** Next.js 16, React 19, TypeScript (strict), `@tanstack/react-table` v8, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/modifiers` + `@dnd-kit/utilities`, shadcn/ui (base-ui, `base-vega` style), Tailwind v4, lucide-react, pnpm. Tests: Vitest + @testing-library/react + jsdom.

Spec: `docs/superpowers/specs/2026-06-16-grouped-data-table-design.md`

---

## File Structure

```
components/grouped-data-table/
  types.ts                    # DimensionDef, GroupColumnConfig, GroupedDataTableProps, GROUP_COLUMN_ID
  grouping-utils.ts           # pure helpers: getGroupRowCount, normalizeGrouping, deriveColumnVisibility
  use-grouped-table.ts        # headless hook: table instance + state + synthesized group column
  group-cell.tsx              # renders the auto Group column (group rows vs leaf rows)
  dimension-picker.tsx        # popover: multi-select groupable dims + @dnd-kit reorder
  grouped-data-table.tsx      # <GroupedDataTable> client component (toolbar + table shell)
  index.ts                    # barrel export
components/ui/table.tsx       # shadcn table primitives (added)
components/ui/popover.tsx     # shadcn dep (added via CLI)
components/ui/checkbox.tsx    # shadcn dep (added via CLI)
components/ui/badge.tsx       # shadcn dep (added via CLI)
app/(examples)/accounts/
  data.ts                     # example dataset (Sombrero accounts)
  columns.tsx                 # example column defs (client)
  page.tsx                    # server component: loads data, renders <GroupedDataTable>
vitest.config.ts              # test runner config
vitest.setup.ts               # jest-dom matchers
components/grouped-data-table/grouping-utils.test.ts
components/grouped-data-table/use-grouped-table.test.tsx
components/grouped-data-table/group-cell.test.tsx
components/grouped-data-table/dimension-picker.test.tsx
```

---

### Task 1: Install dependencies and shadcn primitives

**Files:**
- Modify: `package.json` (via package manager)
- Create: `components/ui/table.tsx`
- Create (via CLI): `components/ui/popover.tsx`, `components/ui/checkbox.tsx`, `components/ui/badge.tsx`

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
pnpm add @tanstack/react-table@^8 @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers @dnd-kit/utilities
```
Expected: packages added to `dependencies` in `package.json`, no peer-dep errors that block install.

- [ ] **Step 2: Add shadcn UI primitives (popover, checkbox, badge)**

Run:
```bash
pnpm dlx shadcn@latest add popover checkbox badge --yes --overwrite
```
Expected: `components/ui/popover.tsx`, `components/ui/checkbox.tsx`, `components/ui/badge.tsx` created using the project's `base-vega` (base-ui) style. If the CLI prompts interactively, re-run with `--yes`.

- [ ] **Step 3: Create the shadcn table primitive by hand**

The shadcn `table` component is plain styled native table elements (style-agnostic). Create `components/ui/table.tsx`:

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-muted-foreground h-10 px-3 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
```

- [ ] **Step 4: Verify typecheck still passes**

Run: `pnpm typecheck`
Expected: PASS (no errors). The new files only import existing `cn` from `@/lib/utils`.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml components/ui
git commit -m "feat: add table deps and shadcn table/popover/checkbox/badge primitives"
```

---

### Task 2: Set up Vitest + Testing Library

**Files:**
- Modify: `package.json` (add devDeps + `test` script)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Install test devDependencies**

Run:
```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```
Expected: devDependencies updated.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
})
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest"
```

- [ ] **Step 4: Add the `test` script to `package.json`**

Add to the `"scripts"` object:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write a smoke test to prove the runner works**

Create `vitest.smoke.test.ts`:
```ts
import { describe, expect, it } from "vitest"

describe("vitest setup", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Run the smoke test**

Run: `pnpm test`
Expected: PASS, 1 test passed.

- [ ] **Step 7: Delete the smoke test and commit**

```bash
rm vitest.smoke.test.ts
git add package.json pnpm-lock.yaml vitest.config.ts vitest.setup.ts
git commit -m "test: set up vitest + testing-library with jsdom"
```

---

### Task 3: Types and pure grouping utilities (TDD)

**Files:**
- Create: `components/grouped-data-table/types.ts`
- Create: `components/grouped-data-table/grouping-utils.ts`
- Test: `components/grouped-data-table/grouping-utils.test.ts`

- [ ] **Step 1: Create `types.ts`**

```ts
import type { ColumnDef, Row } from "@tanstack/react-table"
import type * as React from "react"

/** Stable id for the synthesized auto group column. */
export const GROUP_COLUMN_ID = "__group__" as const

/** A groupable column surfaced in the dimension picker. */
export type DimensionDef = {
  /** Must match the `id` of a column in `columns`. */
  id: string
  /** Human-readable label shown in the picker. */
  label: string
}

export type GroupColumnConfig<TData> = {
  /** Header text for the auto group column, e.g. "Account". */
  header?: React.ReactNode
  /** Renders a leaf (non-group) row inside the group column. */
  renderLeaf: (row: Row<TData>) => React.ReactNode
  /**
   * How the `(count)` next to a group label is computed.
   * "leaf" = total leaf descendants (default), "immediate" = direct sub-rows.
   */
  countMode?: "leaf" | "immediate"
  /** Pixels of indentation per depth level. Default 24. */
  indentSize?: number
}

export type GroupedDataTableProps<TData> = {
  data: TData[]
  /** Measure / attribute columns. Groupable columns must set `enableGrouping: true`. */
  columns: ColumnDef<TData, unknown>[]
  /** Which columns the developer allows grouping on. */
  groupableDimensions: DimensionDef[]
  groupColumn: GroupColumnConfig<TData>
  /** Initial hierarchy order, e.g. ["entity", "bank"]. */
  initialGrouping?: string[]
  /** Enable client-side pagination. Default true. */
  enablePagination?: boolean
}
```

- [ ] **Step 2: Write the failing test for grouping utilities**

Create `components/grouped-data-table/grouping-utils.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import type { Row } from "@tanstack/react-table"
import {
  deriveColumnVisibility,
  getGroupRowCount,
  normalizeGrouping,
} from "./grouping-utils"

// Minimal fake row supporting the two count modes.
function fakeRow(immediate: number, leaf: number): Row<unknown> {
  return {
    subRows: new Array(immediate).fill(null),
    getLeafRows: () => new Array(leaf).fill(null),
  } as unknown as Row<unknown>
}

describe("getGroupRowCount", () => {
  it("defaults to leaf-descendant count", () => {
    expect(getGroupRowCount(fakeRow(2, 9))).toBe(9)
  })
  it("uses immediate sub-row count when countMode is 'immediate'", () => {
    expect(getGroupRowCount(fakeRow(2, 9), "immediate")).toBe(2)
  })
})

describe("normalizeGrouping", () => {
  const allowed = ["entity", "bank"]
  it("keeps only allowed ids, preserving order", () => {
    expect(normalizeGrouping(["bank", "entity"], allowed)).toEqual([
      "bank",
      "entity",
    ])
  })
  it("drops ids not in the allowed list", () => {
    expect(normalizeGrouping(["bank", "ghost"], allowed)).toEqual(["bank"])
  })
  it("dedupes repeated ids", () => {
    expect(normalizeGrouping(["bank", "bank"], allowed)).toEqual(["bank"])
  })
})

describe("deriveColumnVisibility", () => {
  it("hides every currently-grouped dimension column", () => {
    expect(deriveColumnVisibility(["entity"])).toEqual({ entity: false })
  })
  it("returns an empty map when nothing is grouped", () => {
    expect(deriveColumnVisibility([])).toEqual({})
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test grouping-utils`
Expected: FAIL with "Failed to resolve import ./grouping-utils" / functions not defined.

- [ ] **Step 4: Implement `grouping-utils.ts`**

```ts
import type { Row, VisibilityState } from "@tanstack/react-table"

import type { GroupColumnConfig } from "./types"

/** Count shown next to a group label. */
export function getGroupRowCount<TData>(
  row: Row<TData>,
  countMode: GroupColumnConfig<TData>["countMode"] = "leaf",
): number {
  return countMode === "immediate"
    ? row.subRows.length
    : row.getLeafRows().length
}

/** Keep only allowed ids, preserve order, dedupe. */
export function normalizeGrouping(
  grouping: string[],
  allowedIds: string[],
): string[] {
  const allowed = new Set(allowedIds)
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of grouping) {
    if (allowed.has(id) && !seen.has(id)) {
      seen.add(id)
      result.push(id)
    }
  }
  return result
}

/** Hide dimension columns that are currently part of the grouping. */
export function deriveColumnVisibility(grouping: string[]): VisibilityState {
  const visibility: VisibilityState = {}
  for (const id of grouping) {
    visibility[id] = false
  }
  return visibility
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test grouping-utils`
Expected: PASS, all assertions green.

- [ ] **Step 6: Commit**

```bash
git add components/grouped-data-table/types.ts components/grouped-data-table/grouping-utils.ts components/grouped-data-table/grouping-utils.test.ts
git commit -m "feat: add grouped-data-table types and grouping utilities"
```

---

### Task 4: The `useGroupedTable` headless hook (TDD)

**Files:**
- Create: `components/grouped-data-table/use-grouped-table.ts`
- Test: `components/grouped-data-table/use-grouped-table.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/grouped-data-table/use-grouped-table.test.tsx`:
```tsx
import { renderHook, act } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ColumnDef } from "@tanstack/react-table"

import { useGroupedTable } from "./use-grouped-table"
import { GROUP_COLUMN_ID } from "./types"

type Acct = { id: string; entity: string; bank: string; currency: string }

const data: Acct[] = [
  { id: "1", entity: "Coffee Inc", bank: "Citi", currency: "USD" },
  { id: "2", entity: "Coffee Inc", bank: "HSBC", currency: "EUR" },
  { id: "3", entity: "Holding BV", bank: "HSBC", currency: "EUR" },
]

const columns: ColumnDef<Acct, unknown>[] = [
  { id: "entity", accessorKey: "entity", enableGrouping: true },
  { id: "bank", accessorKey: "bank", enableGrouping: true },
  { id: "currency", accessorKey: "currency" },
]

function setup(initialGrouping?: string[]) {
  return renderHook(() =>
    useGroupedTable<Acct>({
      data,
      columns,
      groupableDimensions: [
        { id: "entity", label: "Entity" },
        { id: "bank", label: "Bank" },
      ],
      groupColumn: { renderLeaf: (row) => row.original.id },
      initialGrouping,
      enablePagination: false,
    }),
  )
}

describe("useGroupedTable", () => {
  it("prepends a synthesized group column", () => {
    const { result } = setup()
    const ids = result.current.table.getAllColumns().map((c) => c.id)
    expect(ids[0]).toBe(GROUP_COLUMN_ID)
  })

  it("hides grouped dimension columns and groups the rows", () => {
    const { result } = setup(["entity"])
    expect(result.current.table.getColumn("entity")?.getIsVisible()).toBe(false)
    // Top-level rows are the two entity groups.
    expect(result.current.table.getRowModel().rows.length).toBe(2)
    expect(result.current.table.getRowModel().rows[0].getIsGrouped()).toBe(true)
  })

  it("setGrouping ignores ids that are not groupable dimensions", () => {
    const { result } = setup()
    act(() => result.current.setGrouping(["bank", "ghost"]))
    expect(result.current.grouping).toEqual(["bank"])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test use-grouped-table`
Expected: FAIL with "Failed to resolve import ./use-grouped-table".

- [ ] **Step 3: Implement `use-grouped-table.ts`**

```ts
"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type GroupingState,
  type PaginationState,
  type SortingState,
  type Table,
} from "@tanstack/react-table"

import {
  deriveColumnVisibility,
  normalizeGrouping,
} from "./grouping-utils"
import { GROUP_COLUMN_ID, type GroupedDataTableProps } from "./types"

export type UseGroupedTableResult<TData> = {
  table: Table<TData>
  grouping: GroupingState
  setGrouping: (next: GroupingState) => void
}

export function useGroupedTable<TData>({
  data,
  columns,
  groupableDimensions,
  groupColumn,
  initialGrouping = [],
  enablePagination = true,
}: GroupedDataTableProps<TData>): UseGroupedTableResult<TData> {
  const allowedIds = React.useMemo(
    () => groupableDimensions.map((d) => d.id),
    [groupableDimensions],
  )

  const [grouping, setGroupingState] = React.useState<GroupingState>(() =>
    normalizeGrouping(initialGrouping, allowedIds),
  )
  const [expanded, setExpanded] = React.useState<ExpandedState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  // setGrouping that always normalizes against allowed dimensions.
  const setGrouping = React.useCallback(
    (next: GroupingState) => {
      setGroupingState(normalizeGrouping(next, allowedIds))
    },
    [allowedIds],
  )

  // Synthesized auto group column. Its cell is wired in group-cell.tsx via
  // the meta the consumer passes; here we only reserve the column slot.
  const groupColumnDef = React.useMemo<ColumnDef<TData, unknown>>(
    () => ({
      id: GROUP_COLUMN_ID,
      header: () => groupColumn.header ?? null,
      enableGrouping: false,
      // The actual cell rendering is handled by <GroupCell> in the body,
      // which reads groupColumn from a closure in grouped-data-table.tsx.
      cell: () => null,
    }),
    [groupColumn],
  )

  const allColumns = React.useMemo(
    () => [groupColumnDef, ...columns],
    [groupColumnDef, columns],
  )

  const columnVisibility = React.useMemo(
    () => deriveColumnVisibility(grouping),
    [grouping],
  )

  const table = useReactTable<TData>({
    data,
    columns: allColumns,
    state: {
      grouping,
      expanded,
      sorting,
      columnFilters,
      columnVisibility,
      ...(enablePagination ? { pagination } : {}),
    },
    onGroupingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(grouping) : updater
      setGrouping(next)
    },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    ...(enablePagination
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    paginateExpandedRows: false,
    autoResetExpanded: false,
  })

  return { table, grouping, setGrouping }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test use-grouped-table`
Expected: PASS, all three tests green.

- [ ] **Step 5: Commit**

```bash
git add components/grouped-data-table/use-grouped-table.ts components/grouped-data-table/use-grouped-table.test.tsx
git commit -m "feat: add useGroupedTable headless hook"
```

---

### Task 5: The group cell renderer (TDD)

**Files:**
- Create: `components/grouped-data-table/group-cell.tsx`
- Test: `components/grouped-data-table/group-cell.test.tsx`

`<GroupCell>` decides what to render for one body cell, given the row, the cell, and the group-column config. Group/leaf branching for the group column; aggregated/placeholder/normal branching for other columns.

- [ ] **Step 1: Write the failing test**

Create `components/grouped-data-table/group-cell.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { Cell, Row } from "@tanstack/react-table"

import { GroupCell } from "./group-cell"
import { GROUP_COLUMN_ID, type GroupColumnConfig } from "./types"

type Acct = { id: string; name: string }

const groupColumn: GroupColumnConfig<Acct> = {
  renderLeaf: (row) => <span>leaf:{row.original.name}</span>,
  indentSize: 24,
}

function groupCell(opts: {
  depth: number
  groupedValue: string
  leafCount: number
  expanded: boolean
}): Cell<Acct, unknown> {
  const row = {
    depth: opts.depth,
    getIsExpanded: () => opts.expanded,
    getCanExpand: () => true,
    getToggleExpandedHandler: () => () => {},
    getLeafRows: () => new Array(opts.leafCount).fill(null),
    subRows: new Array(opts.leafCount).fill(null),
  } as unknown as Row<Acct>
  return {
    column: { id: GROUP_COLUMN_ID },
    row,
    getValue: () => opts.groupedValue,
    getIsGrouped: () => true,
    getIsAggregated: () => false,
    getIsPlaceholder: () => false,
  } as unknown as Cell<Acct, unknown>
}

describe("GroupCell", () => {
  it("renders grouped label with leaf-descendant count", () => {
    const cell = groupCell({
      depth: 0,
      groupedValue: "Coffee Inc",
      leafCount: 7,
      expanded: true,
    })
    render(<GroupCell cell={cell} groupColumn={groupColumn} />)
    expect(screen.getByText(/Coffee Inc/)).toBeInTheDocument()
    expect(screen.getByText(/\(7\)/)).toBeInTheDocument()
  })

  it("renders the leaf renderer for a leaf row in the group column", () => {
    const row = {
      depth: 1,
      original: { id: "1", name: "Payroll" },
      getIsExpanded: () => false,
      getCanExpand: () => false,
    } as unknown as Row<Acct>
    const cell = {
      column: { id: GROUP_COLUMN_ID },
      row,
      getValue: () => undefined,
      getIsGrouped: () => false,
      getIsAggregated: () => false,
      getIsPlaceholder: () => false,
    } as unknown as Cell<Acct, unknown>
    render(<GroupCell cell={cell} groupColumn={groupColumn} />)
    expect(screen.getByText("leaf:Payroll")).toBeInTheDocument()
  })

  it("renders nothing for a placeholder cell", () => {
    const cell = {
      column: { id: "currency" },
      row: { depth: 1 } as unknown as Row<Acct>,
      getIsGrouped: () => false,
      getIsAggregated: () => false,
      getIsPlaceholder: () => true,
    } as unknown as Cell<Acct, unknown>
    const { container } = render(
      <GroupCell cell={cell} groupColumn={groupColumn} />,
    )
    expect(container.textContent).toBe("")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test group-cell`
Expected: FAIL with "Failed to resolve import ./group-cell".

- [ ] **Step 3: Implement `group-cell.tsx`**

```tsx
"use client"

import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { flexRender, type Cell } from "@tanstack/react-table"

import { cn } from "@/lib/utils"

import { getGroupRowCount } from "./grouping-utils"
import { GROUP_COLUMN_ID, type GroupColumnConfig } from "./types"

type GroupCellProps<TData> = {
  cell: Cell<TData, unknown>
  groupColumn: GroupColumnConfig<TData>
}

export function GroupCell<TData>({ cell, groupColumn }: GroupCellProps<TData>) {
  const { row, column } = cell
  const isGroupColumn = column.id === GROUP_COLUMN_ID
  const indentSize = groupColumn.indentSize ?? 24

  // Group row, group column: chevron + grouping value + (count).
  if (cell.getIsGrouped() && isGroupColumn) {
    const count = getGroupRowCount(row, groupColumn.countMode)
    const canExpand = row.getCanExpand()
    return (
      <div
        className="flex items-center gap-1"
        style={{ paddingLeft: row.depth * indentSize }}
      >
        <button
          type="button"
          aria-label={row.getIsExpanded() ? "Collapse group" : "Expand group"}
          onClick={row.getToggleExpandedHandler()}
          disabled={!canExpand}
          className={cn(
            "flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted",
            !canExpand && "invisible",
          )}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
        <span className="font-semibold">
          {String(cell.getValue() ?? "")}
        </span>
        <span className="text-muted-foreground">({count})</span>
      </div>
    )
  }

  // Leaf row, group column: developer-supplied leaf renderer, indented.
  if (isGroupColumn) {
    return (
      <div style={{ paddingLeft: (row.depth + 1) * indentSize }}>
        {groupColumn.renderLeaf(row)}
      </div>
    )
  }

  // Aggregated cell (group row, non-group column).
  if (cell.getIsAggregated()) {
    return (
      <>
        {flexRender(
          cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
          cell.getContext(),
        )}
      </>
    )
  }

  // Placeholder cell (group row spanning a non-group column with no aggregation).
  if (cell.getIsPlaceholder()) {
    return null
  }

  // Normal leaf value.
  return (
    <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test group-cell`
Expected: PASS, all three tests green.

- [ ] **Step 5: Commit**

```bash
git add components/grouped-data-table/group-cell.tsx components/grouped-data-table/group-cell.test.tsx
git commit -m "feat: add GroupCell renderer for grouped/leaf/aggregated cells"
```

---

### Task 6: The drag-and-drop dimension picker (TDD)

**Files:**
- Create: `components/grouped-data-table/dimension-picker.tsx`
- Test: `components/grouped-data-table/dimension-picker.test.tsx`

The picker shows a "Group by" popover with a checklist of `groupableDimensions`. Selected dimensions appear as a `@dnd-kit` sortable list; reordering changes the hierarchy. All mutations call `onGroupingChange(orderedIds)`.

- [ ] **Step 1: Write the failing test**

Create `components/grouped-data-table/dimension-picker.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DimensionPicker } from "./dimension-picker"

const dimensions = [
  { id: "entity", label: "Entity" },
  { id: "bank", label: "Bank" },
]

describe("DimensionPicker", () => {
  it("adds a dimension to the grouping when checked", async () => {
    const onGroupingChange = vi.fn()
    render(
      <DimensionPicker
        dimensions={dimensions}
        grouping={[]}
        onGroupingChange={onGroupingChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /group by/i }))
    await userEvent.click(screen.getByRole("checkbox", { name: "Entity" }))
    expect(onGroupingChange).toHaveBeenCalledWith(["entity"])
  })

  it("removes a dimension from the grouping when unchecked", async () => {
    const onGroupingChange = vi.fn()
    render(
      <DimensionPicker
        dimensions={dimensions}
        grouping={["entity", "bank"]}
        onGroupingChange={onGroupingChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /group by/i }))
    await userEvent.click(screen.getByRole("checkbox", { name: "Bank" }))
    expect(onGroupingChange).toHaveBeenCalledWith(["entity"])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test dimension-picker`
Expected: FAIL with "Failed to resolve import ./dimension-picker".

- [ ] **Step 3: Implement `dimension-picker.tsx`**

```tsx
"use client"

import * as React from "react"
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Layers, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import type { DimensionDef } from "./types"

type DimensionPickerProps = {
  dimensions: DimensionDef[]
  grouping: string[]
  onGroupingChange: (next: string[]) => void
}

function SortableDimension({
  dimension,
  onRemove,
}: {
  dimension: DimensionDef
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: dimension.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm",
        isDragging && "opacity-70 shadow-sm",
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-label={`Drag ${dimension.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="flex-1">{dimension.label}</span>
      <button
        type="button"
        aria-label={`Remove ${dimension.label}`}
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function DimensionPicker({
  dimensions,
  grouping,
  onGroupingChange,
}: DimensionPickerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const byId = React.useMemo(
    () => new Map(dimensions.map((d) => [d.id, d])),
    [dimensions],
  )

  const orderedSelected = grouping
    .map((id) => byId.get(id))
    .filter((d): d is DimensionDef => Boolean(d))

  function toggle(id: string, checked: boolean) {
    if (checked) {
      if (!grouping.includes(id)) onGroupingChange([...grouping, id])
    } else {
      onGroupingChange(grouping.filter((g) => g !== id))
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = grouping.indexOf(String(active.id))
    const newIndex = grouping.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    onGroupingChange(arrayMove(grouping, oldIndex, newIndex))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Layers className="size-4" />
          Group by
          {grouping.length > 0 && (
            <Badge variant="secondary">{grouping.length}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Dimensions
          </p>
          {dimensions.map((dimension) => {
            const checked = grouping.includes(dimension.id)
            return (
              <label
                key={dimension.id}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    toggle(dimension.id, value === true)
                  }
                  aria-label={dimension.label}
                />
                {dimension.label}
              </label>
            )
          })}
        </div>

        {orderedSelected.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Hierarchy (drag to reorder)
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={grouping}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {orderedSelected.map((dimension) => (
                    <SortableDimension
                      key={dimension.id}
                      dimension={dimension}
                      onRemove={() => toggle(dimension.id, false)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test dimension-picker`
Expected: PASS. (If the popover renders content lazily and the checkbox isn't found, the test already clicks the trigger first; ensure the shadcn `PopoverContent` mounts children on open.)

- [ ] **Step 5: Commit**

```bash
git add components/grouped-data-table/dimension-picker.tsx components/grouped-data-table/dimension-picker.test.tsx
git commit -m "feat: add drag-and-drop dimension picker"
```

---

### Task 7: The `<GroupedDataTable>` shell + barrel export

**Files:**
- Create: `components/grouped-data-table/grouped-data-table.tsx`
- Create: `components/grouped-data-table/index.ts`

- [ ] **Step 1: Implement `grouped-data-table.tsx`**

```tsx
"use client"

import * as React from "react"
import { flexRender } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DimensionPicker } from "./dimension-picker"
import { GroupCell } from "./group-cell"
import { useGroupedTable } from "./use-grouped-table"
import type { GroupedDataTableProps } from "./types"

export function GroupedDataTable<TData>(props: GroupedDataTableProps<TData>) {
  const { table, grouping, setGrouping } = useGroupedTable(props)
  const enablePagination = props.enablePagination ?? true
  const columnCount = table.getVisibleFlatColumns().length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DimensionPicker
          dimensions={props.groupableDimensions}
          grouping={grouping}
          onGroupingChange={setGrouping}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <GroupCell cell={cell} groupColumn={props.groupColumn} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {enablePagination && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Implement `index.ts`**

```ts
export { GroupedDataTable } from "./grouped-data-table"
export { useGroupedTable } from "./use-grouped-table"
export { GroupCell } from "./group-cell"
export { DimensionPicker } from "./dimension-picker"
export {
  GROUP_COLUMN_ID,
  type DimensionDef,
  type GroupColumnConfig,
  type GroupedDataTableProps,
} from "./types"
```

- [ ] **Step 3: Verify typecheck and full test suite pass**

Run: `pnpm typecheck && pnpm test`
Expected: typecheck PASS, all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add components/grouped-data-table/grouped-data-table.tsx components/grouped-data-table/index.ts
git commit -m "feat: add GroupedDataTable shell and barrel export"
```

---

### Task 8: Example page (Sombrero accounts)

**Files:**
- Create: `app/(examples)/accounts/data.ts`
- Create: `app/(examples)/accounts/columns.tsx`
- Create: `app/(examples)/accounts/page.tsx`

- [ ] **Step 1: Create `data.ts`**

```ts
export type Account = {
  id: string
  entity: string
  bank: string
  accountName: string
  iban: string
  currency: string
  balance: number
}

export const accounts: Account[] = [
  { id: "1", entity: "Sombrero Coffee Inc", bank: "Citi", accountName: "Coffee Operating", iban: "US12CITI0000111122", currency: "USD", balance: 152340.55 },
  { id: "2", entity: "Sombrero Coffee Inc", bank: "Citi", accountName: "Coffee Reserve", iban: "US12CITI0000111133", currency: "USD", balance: 89000.0 },
  { id: "3", entity: "Sombrero Coffee Inc", bank: "HSBC", accountName: "Coffee FX", iban: "GB29HSBC0000222244", currency: "GBP", balance: 41250.1 },
  { id: "4", entity: "Sombrero Holding BV", bank: "HSBC", accountName: "Holding Main", iban: "GB29HSBC0000333355", currency: "EUR", balance: 980500.0 },
  { id: "5", entity: "Sombrero Holding BV", bank: "HSBC", accountName: "Holding Savings", iban: "GB29HSBC0000333366", currency: "EUR", balance: 1200000.0 },
  { id: "6", entity: "Sombrero Holding BV", bank: "ABN AMRO", accountName: "Sombrero Holding - Payroll", iban: "NL92ABNA2067756052", currency: "EUR", balance: 73420.42 },
  { id: "7", entity: "Sombrero France SAS", bank: "BNP Paribas", accountName: "France Operating", iban: "FR7630006000011234567890189", currency: "EUR", balance: 56120.0 },
  { id: "8", entity: "Sombrero France SAS", bank: "BNP Paribas", accountName: "France Tax", iban: "FR7630006000011234567890222", currency: "EUR", balance: 18900.0 },
  { id: "9", entity: "Sombrero France SAS", bank: "Citi", accountName: "France USD", iban: "US12CITI0000444477", currency: "USD", balance: 22000.0 },
]
```

- [ ] **Step 2: Create `columns.tsx`**

```tsx
"use client"

import type { ColumnDef } from "@tanstack/react-table"

import type { Account } from "./data"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const columns: ColumnDef<Account, unknown>[] = [
  {
    id: "entity",
    accessorKey: "entity",
    header: "Entity",
    enableGrouping: true,
  },
  {
    id: "bank",
    accessorKey: "bank",
    header: "Bank",
    enableGrouping: true,
  },
  {
    id: "currency",
    accessorKey: "currency",
    header: "Ccy",
    enableGrouping: false,
  },
  {
    id: "balance",
    accessorKey: "balance",
    header: () => <div className="text-right">Balance</div>,
    enableGrouping: false,
    aggregationFn: "sum",
    cell: ({ getValue }) => (
      <div className="text-right tabular-nums">
        {currencyFormatter.format(Number(getValue() ?? 0))}
      </div>
    ),
    aggregatedCell: ({ getValue }) => (
      <div className="text-right font-medium tabular-nums">
        {currencyFormatter.format(Number(getValue() ?? 0))}
      </div>
    ),
  },
]
```

- [ ] **Step 3: Create `page.tsx`**

```tsx
import { Landmark } from "lucide-react"

import { GroupedDataTable } from "@/components/grouped-data-table"

import { columns } from "./columns"
import { accounts, type Account } from "./data"

export default function AccountsPage() {
  // Server component: in a real app this is where you'd fetch data.
  const data = accounts

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-lg font-semibold">Accounts</h1>
      <GroupedDataTable<Account>
        data={data}
        columns={columns}
        groupableDimensions={[
          { id: "entity", label: "Entity" },
          { id: "bank", label: "Bank" },
        ]}
        initialGrouping={["entity", "bank"]}
        groupColumn={{
          header: "Account",
          countMode: "leaf",
          renderLeaf: (row) => {
            const account = row.original as Account
            return (
              <div className="flex items-center gap-2">
                <Landmark className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium underline-offset-2 hover:underline">
                    {account.accountName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {account.iban}
                  </span>
                </div>
              </div>
            )
          },
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Verify typecheck and build**

Run: `pnpm typecheck && pnpm build`
Expected: typecheck PASS; build completes (route `/accounts` compiled).

- [ ] **Step 5: Commit**

```bash
git add "app/(examples)/accounts"
git commit -m "feat: add Sombrero accounts example page for GroupedDataTable"
```

---

### Task 9: Manual verification in the browser

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Then open `http://localhost:3000/accounts`.

- [ ] **Step 2: Verify the grouped rendering matches the screenshot**

Confirm:
- Left "Account" column shows `Sombrero Coffee Inc (5)`, `Sombrero Holding BV (3)`, `Sombrero France SAS (3)` as expandable group rows (counts = leaf descendants).
- Expanding an entity reveals bank sub-groups (e.g. `Citi (2)`, `HSBC (1)`) indented one level.
- Expanding a bank reveals leaf rows: icon + account name + IBAN below it.
- `Ccy` is blank on group rows, shows the currency on leaf rows.
- `Balance` shows the summed total (bold) on group rows and the formatted value on leaf rows.
- The `entity`/`bank` columns are hidden while grouped (values only appear in the Account column).

- [ ] **Step 3: Verify the dimension picker**

Confirm:
- "Group by" button shows a badge with the active dimension count.
- Opening it lists `Entity` and `Bank` checkboxes (both checked).
- Unchecking `Bank` flattens to entity-only grouping; rechecking restores it.
- Dragging `Bank` above `Entity` in the Hierarchy list re-nests the table (bank becomes the top level).

- [ ] **Step 4: Take a screenshot for the record (optional)**

Use the project's run/preview tooling to capture `/accounts` and compare against the reference screenshot.

- [ ] **Step 5: Stop the dev server.**

---

### Task 10: Final verification gate

**Files:** none

- [ ] **Step 1: Run the full check suite**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: all four PASS.

- [ ] **Step 2: Confirm working tree is committed**

Run: `git status`
Expected: clean (all feature work committed on `feat/grouped-data-table`).

---

## Self-Review Notes (author checklist — already verified)

- **Spec coverage:** single Group column (Task 5, 7), drag-and-drop dimension picker (Task 6), TanStack v8 row models + state (Task 4), leaf-count default (Task 3/5), auto-hide grouped dimensions (Task 3/4), optional aggregation (Task 5 renderer + Task 8 `balance` column), example page reproducing the screenshot (Task 8), headless hook also exported (Task 7 index).
- **Type consistency:** `GROUP_COLUMN_ID`, `DimensionDef`, `GroupColumnConfig.renderLeaf/countMode/indentSize`, `GroupedDataTableProps`, `useGroupedTable` return `{ table, grouping, setGrouping }`, `GroupCell` props `{ cell, groupColumn }`, `DimensionPicker` props `{ dimensions, grouping, onGroupingChange }` — used consistently across tasks.
- **No placeholders:** every code step contains complete code; every run step states the expected result.
- **Known follow-ups (out of scope):** column pivoting, server-side grouping/pagination, virtualization, column resize/pin.
