# GroupedDataTable — Design

**Date:** 2026-06-16
**Status:** Approved (pending spec review)

## Goal

A reusable, strongly typed `GroupedDataTable<TData>` for an internal developer tool that
provides AG-Grid-style **row grouping / drill-down**: multi-level hierarchical groups with
expand/collapse and per-group counts, rendered through a **single auto "Group" column**.

Column pivoting is **out of scope** for this iteration. The architecture must stay friendly to
adding a column-dimension axis later.

## Stack

- Next.js 16 (App Router), React 19
- TypeScript (strict)
- `@tanstack/react-table` **v8** (stable)
- shadcn/ui primitives on `@base-ui/react` (project style `base-vega`)
- Tailwind CSS v4
- `@dnd-kit/core` + `@dnd-kit/sortable` for hierarchy drag-and-drop
- `lucide-react` for icons

## Reference UX (from provided screenshot)

```
Account                                   | Ccy
v Sombrero Coffee Inc (7)                  |
    > Citi (1)                             |
v Sombrero Holding BV (9)                  |
    > HSBC (6)                             |
    v ABN AMRO (1)                         |
        🏦 Sombrero Holding - Payroll      | EUR
           NL92ABNA2067756052              |
v Sombrero France SAS (3)                  |
```

Observations that drive the design:

1. **Single Group column** (`Account`) renders the full indented hierarchy. Other columns
   (`Ccy`) show values **only on leaf rows**; they are blank on group rows.
2. Group rows = chevron + grouping value + `(count)`.
3. The count is the **leaf-descendant count** (`row.getLeafRows().length`), not immediate
   `subRows.length`. `Sombrero Holding BV (9)` contains `HSBC (6)` + `ABN AMRO (1)` + others.
4. **Leaf rows need a developer-supplied rich renderer**: icon + bold/linked primary label +
   muted secondary line. The Group column therefore renders group rows and leaf rows differently.
5. Chevron direction: expanded = ChevronDown, collapsed = ChevronRight; shown only when
   `row.getCanExpand()`.

## Architecture

Approach **A**: a single `<GroupedDataTable>` client component backed by an internal headless
hook `useGroupedTable`. The hook owns the TanStack instance and all state; the component renders
the dimension-picker toolbar + the table shell. The hook is **also exported** as an escape hatch
for advanced consumers who want a custom shell. Logic lives in the hook, not in JSX.

### Module structure

```
components/grouped-data-table/
  use-grouped-table.ts        # headless hook: table instance + state + synthesized group column
  grouped-data-table.tsx      # <GroupedDataTable> client component (toolbar + table shell)
  group-cell.tsx              # renders the auto Group column (group rows vs leaf rows)
  dimension-picker.tsx        # popover: multi-select groupable dims + @dnd-kit reorder
  types.ts                    # GroupedDataTableProps, GroupColumnConfig, DimensionDef
  index.ts                    # barrel export
components/ui/table.tsx       # shadcn table primitives (added)
components/ui/popover.tsx     # shadcn dep for the picker (added)
components/ui/checkbox.tsx    # shadcn dep for the picker (added)
components/ui/badge.tsx       # shadcn dep for chips (added)
app/(examples)/accounts/
  columns.tsx                 # example column defs (client)
  data.ts                     # example dataset (Sombrero accounts)
  page.tsx                    # server component: loads data, renders <GroupedDataTable>
```

## Public API

```ts
// A groupable column surfaced in the dimension picker.
type DimensionDef = { id: string; label: string };

type GroupColumnConfig<TData> = {
  header?: React.ReactNode;                          // e.g. "Account"
  renderLeaf: (row: Row<TData>) => React.ReactNode;  // icon + primary + secondary line
  countMode?: "leaf" | "immediate";                  // default "leaf" -> getLeafRows().length
  indentSize?: number;                               // px per depth level, default 24
};

type GroupedDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];                  // measure / attribute cols (Ccy, balance, ...)
  groupableDimensions: DimensionDef[];               // what the developer allows grouping on
  groupColumn: GroupColumnConfig<TData>;
  initialGrouping?: string[];                        // initial hierarchy order, e.g. ["entity","bank"]
  enablePagination?: boolean;                        // default true
};
```

Column definitions must use `id`s that match `DimensionDef.id` for groupable dimensions, and set
`enableGrouping: true` on those columns.

## Headless hook — `useGroupedTable`

Owns React state:

- `grouping: GroupingState`  (initialized from `initialGrouping`)
- `expanded: ExpandedState`
- `sorting: SortingState`
- `columnFilters: ColumnFiltersState`
- `pagination: PaginationState`

Builds the instance with row models: `getCoreRowModel`, `getSortedRowModel`,
`getFilteredRowModel`, `getGroupedRowModel`, `getExpandedRowModel`, `getPaginationRowModel`.

Key behaviors:

- `paginateExpandedRows: false` — expanded children stay on their parent's page.
- Synthesizes the auto group column `{ id: "__group__" }` and **prepends** it to `columns`. Its
  `cell` delegates to `group-cell.tsx`. It is not itself groupable.
- Auto-hides the dimension columns currently present in `grouping` via a derived
  `columnVisibility` (so grouped values appear only in the Group column, matching the screenshot).
- Returns `{ table, grouping, setGrouping }`. `setGrouping` wraps `table.setGrouping` so the
  picker and presets stay in sync.

## Group column rendering — `group-cell.tsx`

For each visible body cell, branch on cell/row state:

- `cell.getIsGrouped()` → padding-left = `row.depth * indentSize`; chevron button bound to
  `row.getToggleExpandedHandler()` (ChevronDown when `row.getIsExpanded()`, else ChevronRight);
  then `flexRender(cell.column.columnDef.cell, cell.getContext())` for the grouping value;
  then ` (${count})` where count = `countMode === "leaf" ? row.getLeafRows().length :
  row.subRows.length`.
- leaf row **and** this is the group column → `groupColumn.renderLeaf(row)` (indented to depth).
- `cell.getIsAggregated()` → `flexRender(columnDef.aggregatedCell, ...)`.
- `cell.getIsPlaceholder()` → render nothing.
- else → `flexRender(cell.column.columnDef.cell, cell.getContext())` (normal value).

## Dimension picker — `dimension-picker.tsx`

- shadcn `Popover`, trigger labeled "Group by" (shows active count as a badge).
- Body: checklist of `groupableDimensions` (multi-select). Checking adds the dimension to the
  grouping; unchecking removes it.
- Selected dimensions render as a **@dnd-kit `SortableContext`** vertical list; dragging reorders
  the hierarchy. Each item shows a drag handle, label, and a remove (×) button.
- Every mutation calls `setGrouping(orderedIds)`. **Array order == nesting order.**
- Empty grouping = flat table (no group column content; leaf rows render normally).

## Aggregations (optional)

Measure columns may declare `aggregationFn: "sum" | "mean" | "count"` and an `aggregatedCell`
renderer. Aggregated values appear only on group rows via `cell.getIsAggregated()`. The example
includes one numeric `balance` column with a `sum` aggregation; `Ccy` has none (blank on group
rows, matching the screenshot).

## Example page — `app/(examples)/accounts/`

- `data.ts`: Sombrero accounts dataset, row shape
  `{ id, entity, bank, accountName, iban, currency, balance }`.
- `columns.tsx`: client column defs for `currency` (Ccy) and `balance` (with `sum` aggregation),
  plus `enableGrouping: true` on `entity` and `bank`.
- `page.tsx`: server component, loads data, renders `<GroupedDataTable>` with
  `groupableDimensions = [{id:"entity",...},{id:"bank",...}]`,
  `initialGrouping = ["entity","bank"]`, and a `groupColumn.renderLeaf` that draws the bank icon +
  account name + IBAN — reproducing the screenshot.

## Error / edge handling

- Empty `data` → table renders header + an empty-state row.
- `grouping = []` → flat leaf rows, group column shows the leaf renderer only.
- A `grouping` id not present in `groupableDimensions`/columns is ignored (filtered out before
  `setGrouping`).
- Sorting interacts with grouping via TanStack defaults (group rows sort by grouping value).

## Testing strategy

- Unit: `countMode` logic (leaf vs immediate), grouping-order → `setGrouping`, derived
  `columnVisibility` hides grouped dimensions.
- Component: expand/collapse toggles row visibility; picker reorder changes nesting; leaf renderer
  output; aggregated cell appears only on group rows.
- Manual verification: run the example page, confirm it matches the screenshot, exercise the
  picker drag-and-drop.

## Out of scope (future)

- Column pivoting (column-dimension axis). The synthesized group column and dimension config are
  isolated so a parallel column axis can be added without reworking row grouping.
- Server-side grouping/pagination.
- Column resizing / pinning / virtualization.
