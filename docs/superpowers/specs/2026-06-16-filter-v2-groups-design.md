# Filter & Dimension UX v2 — Groups, AND/OR, Multi-select — Design

**Date:** 2026-06-16
**Status:** Approved (pending spec review)
**Supersedes (filter parts of):** `docs/superpowers/specs/2026-06-16-filter-dimension-ux-design.md`

## Goal

Evolve the filter and group-by UX of `GroupedDataTable`:

1. **Human-readable operators** with negations (e.g. "does not contain", "is none of").
2. **Multi-select value control** — a dropdown that multi-selects and shows "N selected" when
   collapsed (replaces the inline checkbox list).
3. **Two-level filter groups with AND/OR** (Airtable-style): groups joined by a top-level
   combinator; conditions within a group joined by the group's combinator.
4. **Group-by dimensions via a multi-select dropdown** ("N selected") + the existing
   drag-to-reorder hierarchy list (replaces the dimension checklist).

All config stays serializable (MCP-ready). Active selection state stays internal/UI-driven.

## Architecture decision: pre-filter the data

Two-level AND/OR cannot be expressed with TanStack's per-column `columnFilters` (which only ANDs
columns). **Approach A (chosen):** a pure `evaluateFilterState(row, filterState, get)` walks the
group tree, and the hook passes `data.filter(...)` into `useReactTable`. Grouping, aggregation,
and counts then run on the filtered rows automatically. This drops the `columnFilters` +
per-column `filterFn` wiring from v1.

Consequence: filterable columns must be **real data fields** (accessorKey) — already the case. The
evaluator reads values via `row[columnId]`.

Rejected: TanStack `globalFilter` (invoked per-column then OR-ed — a semantic hack for a whole-row
predicate); keeping `columnFilters` (cannot do OR).

## Data model (`types.ts`)

```ts
export type Combinator = "and" | "or"

// FilterCondition unchanged:
export type FilterCondition = {
  id: string
  columnId: string
  operator: FilterOperator
  value: FilterValue
}

export type FilterGroup = {
  id: string
  combinator: Combinator       // joins this group's conditions
  conditions: FilterCondition[]
}

export type FilterState = {
  combinator: Combinator       // joins the groups
  groups: FilterGroup[]
}
```

`FilterOperator` gains `doesNotContain`, `isNot` (text), `isNoneOf` (select):

```ts
export type FilterOperator =
  | "contains" | "doesNotContain" | "equals" | "isNot" | "startsWith"  // text
  | "eq" | "ne" | "gt" | "lt" | "between"                              // number
  | "is" | "isAnyOf" | "isNoneOf"                                       // select
  | "before" | "after" | "dateBetween"                                 // date
```

`GroupedDataTableProps`: replace `initialFilters?: FilterCondition[]` with
**`initialFilterState?: FilterState`**. (`filterableColumns?: FilterDef[]` unchanged.)

## Operators — labels + defaults (`filter-utils.ts`)

Default operator sets per `FilterType`:
- **text:** `contains`, `doesNotContain`, `equals`, `isNot`, `startsWith`
- **number:** `eq`, `ne`, `gt`, `lt`, `between`
- **select:** `isAnyOf`, `isNoneOf`, `is`
- **date:** `before`, `after`, `dateBetween`

`OPERATOR_LABELS` (human-readable):
```
contains: "contains", doesNotContain: "does not contain",
equals: "is", isNot: "is not", startsWith: "starts with",
eq: "equals", ne: "not equal", gt: "greater than", lt: "less than", between: "between",
is: "is", isAnyOf: "is any of", isNoneOf: "is none of",
before: "before", after: "after", dateBetween: "between"
```

`evaluateCondition` adds:
- `doesNotContain` → `!contains` (empty value ⇒ true).
- `isNot` → case-insensitive `String(cell) !== String(value)` (empty ⇒ true).
- `isNoneOf` → `!isAnyOf` (empty array ⇒ true).

(Existing operators keep their semantics: text case-insensitive; `between`/`dateBetween` inclusive
and guard non-array / blank-bound as no-constraint; `is`/`isAnyOf` exact-match select values.)

## Pure tree logic (`filter-utils.ts`)

- `evaluateGroup<TData>(row, group, get)` — active (complete) conditions only; combine via
  `group.combinator` (`and` ⇒ every, `or` ⇒ some); empty group ⇒ `true`.
- `evaluateFilterState<TData>(row, state, get)` — active groups only (a group with no complete
  conditions is skipped); combine via `state.combinator`; empty ⇒ `true`.
- `get` is `(columnId) => row[columnId]` supplied by the hook.
- `isConditionComplete(condition)` — value not empty (reuses the v1 `isEmpty` rule).
- Tree mutation helpers (pure, return new state):
  `emptyFilterState()`, `addGroup(state, groupId, conditionId)`,
  `addCondition(state, groupId, conditionId, filterDefs)`,
  `removeCondition(state, groupId, conditionId)`, `removeGroup(state, groupId)`,
  `updateCondition(state, groupId, condition)`, `setGroupCombinator(state, groupId, combinator)`,
  `setTopCombinator(state, combinator)`,
  `normalizeFilterState(state, filterableIds)` (drops conditions on unknown columns; drops groups
  left with zero conditions).
- Reuse v1 condition helpers (`createCondition`, `withColumn`, `withOperator`, `withValue`,
  `operatorsForDef`, `describeCondition`) for editing individual conditions.

## Components

### `multi-select.tsx` (new, reusable)

`MultiSelect({ options, selected, onChange, placeholder, ariaLabel })`:
- shadcn `Popover` trigger (a `Button`) showing **"N selected"** (or `placeholder` when empty).
- Popover body: a checkbox list of `options` (`{label,value}`); toggling updates `selected: string[]`
  via `onChange`.
- Split into `MultiSelect` (popover wrapper) + `MultiSelectContent` (the checkbox list) so the
  list is directly testable in jsdom (base-ui Popover won't open there).

Used by the filter value input (`isAnyOf`/`isNoneOf`) and the Group-by dimension picker.

### `filter-builder.tsx` (rebuilt for groups)

- `FilterPopover` trigger ("Filters" + badge = active-condition count).
- `FilterBuilderContent({ filterableColumns, filterState, onFilterStateChange })`:
  - Renders each **group** in a bordered block. Inside a group: first condition row labeled
    "Where"; the second row shows the group combinator selector (`and`/`or`) which sets the whole
    group's combinator; subsequent rows show it read-only. Each condition row =
    `[column Select] [operator Select] [value input] [× remove]`. A "+ Add filter" button appends
    a condition to that group.
  - Between groups: a combinator selector (`and`/`or`) that sets the top combinator (editable on
    the first connector, read-only after).
  - "+ Add filter group" appends a new group (seeded with one condition).
  - Value input adapts: text/number/date `Input` (two for `between`/`dateBetween`); single `Select`
    for `is`; **`MultiSelect`** for `isAnyOf`/`isNoneOf`.
  - All mutations go through the pure tree helpers → `onFilterStateChange(nextState)`.

### `dimension-picker.tsx` (updated)

- Replace the checkbox checklist with the **`MultiSelect`** dropdown ("N selected") listing all
  `groupableDimensions`.
- Keep the existing `@dnd-kit` drag-to-reorder list of the selected dimensions below it.
- Selecting/deselecting in the dropdown adds/removes from `grouping`; dragging reorders.

### `grouped-data-table.tsx` (toolbar)

- Render `FilterPopover` (when `filterableColumns` non-empty) + `DimensionPicker`.
- **Remove the per-condition chips row** (`filter-chips.tsx` deleted) — with groups + OR it would
  misrepresent the logic. The Filters button badge (active-condition count) conveys filter
  presence; the popover is the single source of truth.

### `use-grouped-table.ts`

- Replace `filterConditions` with `filterState: FilterState` (init from `initialFilterState` via
  `normalizeFilterState`, default `emptyFilterState()`).
- `setFilterState(next | updater)` normalizes against `filterableIds`.
- `filteredData = useMemo(() => filterState has any active condition ? data.filter(r =>
  evaluateFilterState(r, filterState, (id) => (r as Record<string, unknown>)[id])) : data,
  [data, filterState])`.
- Pass `filteredData` to `useReactTable` as `data`. Remove `columnFilters` state, the derived
  `columnFilters`, and the `filterFn` injection onto columns.
- Return `{ table, grouping, setGrouping, filterState, setFilterState }`.

## Public API / barrel (`index.ts`)

Export: `MultiSelect`, `MultiSelectContent`; updated `FilterPopover`/`FilterBuilderContent`; types
`Combinator`, `FilterGroup`, `FilterState` (plus existing `FilterDef`/`FilterCondition`/`FilterType`/
`FilterOperator`/`FilterValue`); the pure helpers (`evaluateFilterState`, `evaluateGroup`,
tree mutation helpers, `describeCondition`, `operatorsForDef`, `OPERATOR_LABELS`,
`defaultOperatorsFor`, `evaluateCondition`). Remove `FilterChips` and the v1
`conditionsToColumnFilters`/`makeFilterFn` exports.

## Example (`accounts-table.tsx`)

`filterableColumns` unchanged. Optionally seed an `initialFilterState` to demo a group (e.g. one
group: `bank is any of [...]` AND `balance greater than 0`). Default: no initial filters.

## Testing

- **Pure (`filter-utils.test.ts`):** new operators (`doesNotContain`/`isNot`/`isNoneOf`);
  `evaluateGroup` (and/or, empty passthrough); `evaluateFilterState` (top and/or, skip empty
  groups, mixed AND-of-OR / OR-of-AND); every tree mutation helper; `normalizeFilterState`
  (drop unknown columns, prune empty groups).
- **`multi-select.test.tsx`:** `MultiSelectContent` toggles add/remove → `onChange`; trigger shows
  "N selected".
- **`filter-builder.test.tsx`:** Add filter (appends condition to group), Add filter group
  (appends group), change group combinator, change top combinator, remove condition, value typing
  — assert `onFilterStateChange` args (logic via pure helpers; jsdom buttons/inputs).
- **`dimension-picker.test.tsx`:** selecting a dimension in MultiSelectContent adds it to grouping;
  drag-reorder list still works (existing reorder test retained).
- **`use-grouped-table.test.tsx`:** `initialFilterState` filters rows & recomputes groups; an OR
  group keeps rows matching either condition; `setFilterState` normalizes.
- **`grouped-data-table.test.tsx`:** render with `initialFilterState`, assert filtered rows +
  recomputed counts; badge shows active count; no chips row.
- **Browser:** AND vs OR groups produce the expected row sets; multi-select "N selected"; group-by
  dropdown + reorder.

## File structure

```
components/grouped-data-table/
  types.ts             # Combinator/FilterGroup/FilterState; new operators; initialFilterState prop
  filter-utils.ts      # new operators, evaluateGroup/evaluateFilterState, tree mutation helpers
  multi-select.tsx     # NEW reusable multi-select dropdown
  filter-builder.tsx   # rebuilt: groups + AND/OR connectors + MultiSelect value
  dimension-picker.tsx # MultiSelect dropdown + drag-reorder list
  use-grouped-table.ts # filterState + pre-filtered data
  grouped-data-table.tsx # toolbar (no chips row)
  filter-chips.tsx     # DELETED
  index.ts             # updated exports
app/(examples)/accounts/accounts-table.tsx  # optional initialFilterState
```

## Phasing (implementation)

1. **Model + eval + hook:** types, operators, `evaluateGroup`/`evaluateFilterState`, tree helpers,
   hook switch to pre-filtered data. (No UI yet; existing UI temporarily adapted or stubbed.)
2. **Filter builder v2 + MultiSelect:** `multi-select.tsx`, rebuilt `filter-builder.tsx`, remove
   `filter-chips.tsx`, toolbar update.
3. **Group-by MultiSelect:** `dimension-picker.tsx` dropdown + reorder.

Each phase keeps the suite green and the example building. Phases may be separate implementation
plans.

## Out of scope (unchanged)

- Arbitrary (>2-level) nesting; per-pair combinators.
- Applying active filters via code/MCP (controlled props); MCP server; registry packaging.
- `getRowId`.
