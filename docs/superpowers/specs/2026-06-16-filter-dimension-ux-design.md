# Filter, Dimension & Hierarchy UX — Design

**Date:** 2026-06-16
**Status:** Approved (pending spec review)
**Builds on:** `docs/superpowers/specs/2026-06-16-grouped-data-table-design.md`

## Goal

Make `GroupedDataTable<TData>` filterable and make its grouping/hierarchy controls
intuitive, with everything **parameterized by declarative, serializable config**. The
developer (and later an MCP tool) declares the *available* filter options, groupable
dimensions, and initial hierarchy; the **end user applies** filters / dimensions / hierarchy
order interactively through the UI.

Active selection state stays internal to the component (UI-driven). There are **no controlled
props and no imperative "apply" API** in this iteration — but the config types are plain data so
a future MCP tool can generate them, and code/MCP application of active state can be added later
without rework.

## Non-goals (future phases, must not be precluded)

- MCP server exposing a tool that **generates** `filterableColumns` / `groupableDimensions`.
- Applying active selections via code/MCP (controlled props).
- OR-combination of filter conditions (v1 is AND-only).
- Registry packaging ("Kotsas UI").
- `getRowId` prop, always-visible row-group panel (hierarchy stays in the "Group by" popover).

## Stack additions

- shadcn (base-ui) primitives **`select`** and **`input`** (added via CLI).
- Reuses existing: TanStack Table v8 `columnFilters` + `getFilteredRowModel`, `@dnd-kit`,
  the `DimensionPicker` popover pattern.

## Public API additions (`types.ts`)

```ts
export type FilterType = "text" | "number" | "select" | "date"

export type FilterOperator =
  | "contains" | "equals" | "startsWith"   // text
  | "eq" | "ne" | "gt" | "lt" | "between"  // number
  | "is" | "isAnyOf"                        // select
  | "before" | "after" | "dateBetween"     // date

export type FilterDef = {
  /** Must match a column id. */
  id: string
  label: string
  type: FilterType
  /** Allowed operators; falls back to defaultOperatorsFor(type) when omitted. */
  operators?: FilterOperator[]
  /** Required for type "select" — the choosable values. */
  options?: { label: string; value: string }[]
}

export type FilterCondition = {
  /** Unique id for keying / removal. */
  id: string
  columnId: string
  operator: FilterOperator
  value: string | number | [number, number] | string[] | null
}
```

`GroupedDataTableProps<TData>` gains:

```ts
/** Declares which columns are filterable and how (the filter "options"). */
filterableColumns?: FilterDef[]
/** Optional initial active conditions (mirrors initialGrouping; config-level, not required). */
initialFilters?: FilterCondition[]
```

## Default operators per type

- `text`: `contains` (default), `equals`, `startsWith`
- `number`: `eq`, `ne`, `gt`, `lt`, `between`
- `select`: `is`, `isAnyOf`
- `date`: `before`, `after`, `dateBetween`

## Pure logic — `filter-utils.ts`

No React imports; fully unit-testable.

- `defaultOperatorsFor(type: FilterType): FilterOperator[]`
- `OPERATOR_LABELS: Record<FilterOperator, string>` — display strings (`contains`, `=`, `≠`,
  `>`, `<`, `between`, `is`, `is any of`, `before`, `after`, `between`).
- `evaluateCondition(cellValue: unknown, operator: FilterOperator, value): boolean` — the
  predicate engine. Handles type coercion (numbers via `Number()`, text via case-insensitive
  string compare, dates via `Date` parsing, select `isAnyOf` via array `includes`). A condition
  with an empty/`null` value is treated as "no constraint" (returns `true`) so half-built
  conditions don't hide all rows.
- `conditionsToColumnFilters(conditions: FilterCondition[]): ColumnFiltersState` — groups
  conditions by `columnId` into `{ id, value: FilterCondition[] }` entries (multiple conditions
  on one column become an array, AND-ed by the filterFn).
- `describeCondition(condition, filterDef?): string` — chip label, e.g. `Balance > 100,000`,
  `Bank is any of HSBC, Citi`.
- `makeFilterFn<TData>(): FilterFn<TData>` — reads the column's `FilterCondition[]` from
  `filterValue` and returns `conditions.every(c => evaluateCondition(row.getValue(columnId),
  c.operator, c.value))`. ANDs conditions within a column; TanStack ANDs across columns → overall
  AND.

## Hook — `use-grouped-table.ts`

Adds:

- `filterConditions: FilterCondition[]` state, initialized from `initialFilters ?? []`.
- `setFilterConditions(next)` setter (plus the value is normalized: conditions whose `columnId`
  is not in `filterableColumns` are dropped, mirroring grouping normalization).
- Derived `columnFilters = conditionsToColumnFilters(filterConditions)`, passed as controlled
  `state.columnFilters`.
- Column augmentation: any column whose `id` appears in `filterableColumns` gets
  `filterFn: makeFilterFn()` injected (developer column defs need no manual filter wiring). The
  synthesized group column and non-filterable columns are untouched.
- Returns `{ table, grouping, setGrouping, filterConditions, setFilterConditions }`.

**Data flow:** config → builder UI → `FilterCondition[]` (internal state) →
`conditionsToColumnFilters` → `table.columnFilters` → `getFilteredRowModel` filters leaf rows →
`getGroupedRowModel` regroups the filtered leaves → counts & aggregations recompute over filtered
data. Active chips reflect the conditions.

## Components

### `filter-builder.tsx`

- `FilterPopover(props)` — wrapper: shadcn `Popover`, trigger is a `Button` ("Filters" + a `Badge`
  with the active-condition count when > 0). Renders `FilterBuilderContent` inside.
- `FilterBuilderContent({ filterableColumns, conditions, onConditionsChange })` — directly
  testable body (mirrors `DimensionPickerContent`). Shows each condition as a row:
  `[column Select] [operator Select] [value input]` + a remove (×) button, plus an "+ Add filter"
  button that appends a new condition defaulted to the first filterable column and its first
  operator.
  - **Value input adapts to `type`:** `text` → `Input`; `number` → `Input type="number"` (two
    inputs for `between`); `select` → a single `Select` (operator `is`) or a checkbox list
    (operator `isAnyOf`) sourced from `FilterDef.options`; `date` → `Input type="date"` (two for
    `dateBetween`).
  - Changing column resets operator to the column's first allowed operator and clears value.
  - Every mutation calls `onConditionsChange(nextConditions)`.

### `filter-chips.tsx`

- `FilterChips({ conditions, filterDefs, onRemove })` — renders each active condition as a
  removable `Badge`/chip using `describeCondition`; the × calls `onRemove(conditionId)`. Renders
  nothing when there are no conditions.

### `DimensionPicker`

Unchanged. Hierarchy stays inside the "Group by" popover.

### `grouped-data-table.tsx` (toolbar)

```
[ Filters ▾ (n) ]   [ Group by ▾ (n) ]
<FilterChips ...>                              ← active-filter chip row (omitted if none)
──────────────────────────────────────────
<table>
```

`FilterPopover` is rendered only when `filterableColumns` is non-empty.

## Example page

`app/(examples)/accounts/`: add `filterableColumns` to the `AccountsTable`:

- `entity` — `select`, options derived from the data's entities.
- `bank` — `select`, options derived from the data's banks.
- `currency` — `select`, options `[USD, EUR, GBP]`.
- `balance` — `number`.

Demonstrates select + number inputs and the chips row.

## Testing

- `filter-utils.test.ts` — `defaultOperatorsFor`; `evaluateCondition` for each type/operator
  (incl. empty-value passthrough, `between`, `isAnyOf`); `conditionsToColumnFilters` grouping;
  `describeCondition` labels.
- `filter-builder.test.tsx` — add condition; change column (resets operator/value); change
  operator; set a value; remove condition — each asserting `onConditionsChange` args (render
  `FilterBuilderContent` directly).
- `grouped-data-table.test.tsx` — render with `filterableColumns` + `initialFilters`, assert
  filtered row set and recomputed group counts; (optionally) drive a filter through the content
  and assert rows shrink.

## File structure

```
components/grouped-data-table/
  types.ts             # + FilterType/FilterOperator/FilterDef/FilterCondition; extend props
  filter-utils.ts      # pure filter logic (new)
  filter-builder.tsx   # FilterPopover + FilterBuilderContent + value inputs (new)
  filter-chips.tsx     # active-condition chip row (new)
  use-grouped-table.ts # + filter state, derived columnFilters, filterFn augmentation
  grouped-data-table.tsx # toolbar: Filters + Group by + chips
  index.ts             # export new public types/components
components/ui/select.tsx, input.tsx   # new shadcn primitives
app/(examples)/accounts/accounts-table.tsx  # add filterableColumns
```

## Error / edge handling

- Half-built condition (no value) → treated as no constraint (rows not hidden).
- Condition referencing a non-filterable/unknown column → dropped on normalization.
- `select` filter with no `options` → renders a free-text input fallback (and logs nothing).
- Filtering everything out → existing empty-state row ("No results.") shows.
- Filtering + grouping interaction → groups recompute over filtered leaves (row-model order
  already correct in the hook).
