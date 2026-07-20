# Unifying GroupedDataTable into DataTable — Design

**Date:** 2026-07-20
**Status:** Approved for planning (rev. 2 — open questions resolved, see end)
**Author:** drafted with Giannis

## Goal

Fold `GroupedDataTable` into `DataTable` as an **opt-in `grouping` config**, so the two
table families stop evolving independently. Today a feature landing on one is invisible to
the other, and ~920 lines of source are physically duplicated between them to keep each
registry item self-contained.

The end state is one grid engine with one interaction spine, where grouping is a mode
rather than a separate product — while flat-table consumers pay nothing extra (no dnd-kit,
no grouping UI) and existing `GroupedDataTable` consumers keep working.

This closes a gap the DataTable architecture spec
(`2026-07-11-datatable-architecture-design.md`) explicitly deferred:

> `@kotsas-ui/grouped-data-table` … **(future) extends** `@kotsas-ui/data-table`
> "DataTable covers everything the current grouped table's non-grouping base does, so
> `grouped-data-table` can later sit on it without loss."
> Non-goal (R1): "refactoring `grouped-data-table` onto `DataTable` (later release)."
> Resolved decision 5: "Pinned/grouped interaction — stays deferred with the grouped-table
> refactor; the pinning and gutter APIs must not assume a flat-only table."

## Context / current state

Verified against the source at `5c0227a`, not assumed.

### The two families share no code — they share *copies*

`grouped-data-table/*` never imports from `data-table/*`, in either direction. Five files
are **byte-identical duplicates**:

| File | Lines |
|---|---|
| `filter-builder.tsx` | 327 |
| `filter-utils.ts` | 262 |
| `primitives.tsx` | 111 |
| `primitives.radix.tsx` | 97 |
| `multi-select.tsx` | 82 |
| **Total** | **879** |

Plus a 42-line `FilterType`/`FilterOperator`/`FilterDef`/`FilterValue`/`FilterCondition`/
`Combinator`/`FilterGroup`/`FilterState` block duplicated inside each family's `types.ts`,
and `filter-utils.test.ts` / `filter-builder.test.tsx` / `multi-select.test.tsx` /
`primitives.test.tsx` duplicated alongside them.

**This duplication is deliberate, not accidental.** `grouped-data-table/cross-family-parity.test.ts`
documents the rationale and pins the five files byte-for-byte:

> "grouped-data-table deliberately DUPLICATES several source files from data-table so each
> registry item stays self-contained (`npx shadcn add` of either one must not depend on the
> other). … This test pins the duplicated files byte-for-byte across families, so any future
> edit to one copy fails loudly until it's mirrored."

That test also records that silent drift **already happened once** before it existed:
"PopoverButtonTrigger gained a `disabled` prop in data-table only."

Two corrections to the framing this design started from:

1. The copies do **not** silently drift today — the parity test prevents it.
2. But the parity test deliberately **excludes `types.ts`**, on the reasoning that "each
   family's public type surface … legitimately differ." That exclusion is correct for the
   families' own props, but it also leaves the **42-line duplicated filter type block
   unguarded**. It is currently still identical; nothing would catch it diverging.

So the live cost is not drift — it is that **every edit to filter logic must be made twice**,
and that a feature built on one family simply does not exist on the other.

### Feature asymmetry

| Capability | `DataTable` | `GroupedDataTable` |
|---|---|---|
| Row grouping / expand / per-group counts | ✗ | ✓ |
| Dimension picker (drag-and-drop) | ✗ | ✓ |
| Per-group aggregation (`aggregatedCell`) | ✗ | ✓ |
| AND/OR filter groups | ✓ | ✓ (duplicate impl) |
| Client pagination | ✓ | ✓ (duplicate impl) |
| Typed column builder (`defineColumns`) | ✓ | ✗ |
| Inline editing + grid keyboard spine | ✓ | ✗ |
| Undo/redo, clipboard copy/paste, CSV export | ✓ | ✗ |
| Row selection + gutter + tri-state select-all | ✓ | ✗ |
| Sort UI, column hide/pin/resize | ✓ | ✗ |
| Footer / selection aggregation | ✓ | ✗ |
| Bulk actions menu | ✓ | ✗ |
| Stable row ids (`getRowId`) | ✓ | ✗ |

`GroupedDataTable` consumers hand-write every `ColumnDef.cell` — visible in the CRM Pipeline
block, which reaches into `table-fields`' `*Cell` helpers directly precisely because the
`defineColumns` path is unavailable to it.

### What is already merge-ready

Three findings materially reduce the risk, and shape the plan below:

1. **`useGridNavigation` is already table-agnostic.** It operates over plain
   `rowIds: string[]` / `columnIds: string[]` with no TanStack dependency
   (`use-grid-navigation.ts`). It does not need rewriting for grouping — only a
   per-*cell* editability gate (below) instead of the current per-*column* one.
2. **The structural-column injection pattern already exists.** `useDataTable` prepends
   `buildRowGutterColumn()` when `enableRowSelection` is set — a table-owned column with no
   `TData` accessor, deliberately outside `defineColumns`. The auto group column is the same
   shape and can use the same mechanism.
3. **The `columnVisibility` merge is pre-designed.** `use-grouped-table.ts` derives
   visibility one-way from `grouping` and its own comment already specifies the fix for
   combining it with user-toggled visibility:
   `{ ...userVisibility, ...deriveColumnVisibility(grouping) }`.

Both hooks additionally duplicate the same `filteredData` pre-filter memo and the same
`autoResetPageIndex`-clamp effect, near-comment-for-comment.

## Success criteria

1. **One engine.** Grouping, filtering, selection, editing, and aggregation are implemented
   once. No file is duplicated across families; `cross-family-parity.test.ts` is deleted
   because it has nothing left to guard.
2. **Flat tables pay nothing.** With `grouping` omitted, `DataTable` behaves byte-for-byte as
   today, installs no dnd-kit, and lands no grouping UI files in the consumer's project.
3. **No regression for grouped consumers.** The existing `grouped-data-table.test.tsx`,
   `use-grouped-table.test.tsx`, `group-cell.test.tsx`, and `dimension-picker.test.tsx`
   suites pass **unmodified** against the new implementation — they are the compatibility
   contract, not optional coverage.
4. **Grouping composes with the grid spine.** A grouped table can be editable, selectable,
   sortable, and exportable — the combinations that don't exist today.
5. **Dual-base preserved.** base-ui and Radix builds stay at parity; the per-family
   `primitives.parity.test.ts` continues to pass.
6. **Migration is time-boxed, not permanent.** `GroupedDataTable` keeps working via a thin
   wrapper so no consumer is forced to change code *in the release that lands this* — but the
   wrapper is a one-release migration window, then removed (decision 2). "Success" is
   consumers actually migrated off it, not the shim surviving.

## Non-goals

- **Column pivoting.** Still out of scope, as in the original GroupedDataTable design. This
  is row grouping only — which is precisely why the repo is being renamed off
  `react-pivot-table` (decision 1).
- **Server-side grouping.** Grouping stays client-side over loaded rows, consistent with
  today. The hybrid `computeAggregate` escape hatch is unchanged.
- **Editing group rows.** Group rows are structural; only leaf rows are editable.
- **Controlled table state.** Grouping stays uncontrolled like every other piece of table
  state (decision 3).

## Architecture

### Registry shape

Current (5 items — 3 logical × dual-base for two of them):

```
@kotsas-ui/table-fields
@kotsas-ui/data-table            (+ -radix)   ─┐ 879 duplicated lines
@kotsas-ui/grouped-data-table    (+ -radix)   ─┘
```

Proposed:

```
@kotsas-ui/table-fields                     leaf; unchanged
@kotsas-ui/data-table          (+ -radix)   grid engine; grouping opt-in
   └─ registryDependency → @kotsas-ui/table-fields          (already the case today)
@kotsas-ui/dimension-picker    (+ -radix)   dnd-kit drag/drop grouping UI; optional add-on
@kotsas-ui/grouped-data-table  (+ -radix)   deprecated thin wrapper → data-table + dimension-picker
```

**Why the dimension picker stays a separate item.** `dnd-kit` is 4 npm packages used by
exactly one file (`dimension-picker.tsx`, the only `dnd-kit` importer in the repo). In a
copy-paste registry, "install cost" is files-in-your-repo plus npm deps — folding the picker
into `data-table` would push 4 packages onto every flat-table consumer for a feature they
disabled. Splitting it keeps `data-table`'s dependency list exactly as it is today
(`@tanstack/react-table`, `lucide-react`, `sonner`).

The grouping *engine* (`grouping-utils.ts` ~50 lines, group-cell rendering ~115 lines) is
small and dependency-free, so it ships inside `data-table` rather than as a third item. That
is a net reduction: ~165 lines land for flat consumers who don't need them, against 879 lines
of duplication removed.

**Note on the self-containment constraint.** `cross-family-parity.test.ts` justifies the
duplication with "`npx shadcn add` of either one must not depend on the other." That
constraint is looser than stated — `data-table` **already** declares
`@kotsas-ui/table-fields` in `registryDependencies`, and the shadcn CLI resolves it. A
cross-item dependency is a proven, shipped pattern in this registry, so the proposed graph
introduces no new mechanism.

### Public API

Grouping becomes one optional prop object. Omitted → today's flat table exactly.

```ts
<DataTable<Deal>
  data={deals}
  columns={columns}
  getRowId={(r) => r.id}
  editable
  enableRowSelection
  grouping={{
    /** Which columns the user may group by (drives the dimension picker). */
    dimensions: [
      { id: "stage", label: "Stage" },
      { id: "owner", label: "Owner" },
    ],
    /** Initial hierarchy; applied at mount, like today's initialGrouping. */
    initial: ["stage"],
    /** Auto group column config — unchanged shape from GroupColumnConfig. */
    column: {
      header: "Deal",
      countMode: "leaf",
      indentSize: 24,
      leaf: { icon, primary, secondary },
    },
  }}
/>
```

Prop mapping for the compatibility wrapper:

| `GroupedDataTable` (today) | `DataTable` (proposed) |
|---|---|
| `groupableDimensions` | `grouping.dimensions` |
| `initialGrouping` | `grouping.initial` |
| `groupColumn` | `grouping.column` |
| `filterableColumns` | `filterableColumns` (unchanged) |
| `initialFilterState` | `initialFilterState` (unchanged) |
| `enablePagination` | `enablePagination` (unchanged) |

`GroupedDataTable` becomes ~20 lines that translate these and render `DataTable`. Its
existing tests then assert the wrapper, which is exactly the regression contract we want.

### The five real integration problems

Everything above is mechanical. These are the parts that need actual decisions.

#### 1. Row identity

`DataTable` threads `getRowId` through selection, editing, undo, and clipboard.
`GroupedDataTable` passes no `getRowId` at all, so rows use TanStack's default index-path
ids. Under grouping, TanStack synthesises group-row ids from the grouping value
(`stage:negotiation>owner:maria`), which are **not** `TData` ids and must never reach
`updateData`.

**Decision:** leaf rows keep consumer-supplied `getRowId`; group rows keep TanStack's
synthetic ids. Every mutation path (`updateData`, undo entries, clipboard writes) asserts it
was handed a leaf row id. `CellPos.rowId` gains no new shape — the guard lives at the
boundary, in `beginEdit` and `commitBatch`.

#### 2. Navigation and editability over group rows

`useGridNavigation` currently gates editing per column: `isColumnEditable(columnId)`. Under
grouping, editability is a property of the **cell**, not the column — the same column is
editable on a leaf row and not on a group row.

**Decision:** generalize the hook's one gate from `isColumnEditable(columnId: string)` to
`isCellEditable(pos: CellPos)`. `useDataTable` supplies the implementation
(`isColumnEditable(pos.columnId) && !isGroupRow(pos.rowId)`). This is a small, contained
change to a pure, well-tested hook and requires no other navigation rework.

Group rows stay **navigable** (so the chevron is keyboard-reachable) but not editable, with
`Enter` on a group row toggling expansion instead of entering edit mode. The alternative —
feeding only leaf ids to the nav hook — makes group rows unreachable by keyboard and is
rejected on accessibility grounds.

#### 3. Selection semantics

Selecting a group row must imply its descendants. TanStack supports this natively via the
`enableSubRowSelection` table option, plus `row.getIsAllSubRowsSelected()` and
`row.getIsSomeSelected()` for the tri-state. (Verified against the installed
`@tanstack/table-core` 8.21.3 — note the indeterminate accessor is `getIsSomeSelected`;
there is no `getIsSomeSubRowsSelected`.)

**Decision:** enable sub-row selection; the gutter renders tri-state on group rows. The
existing `isAllMatchingSelected` logical-selection cycle is orthogonal (it concerns rows not
yet loaded) and is unaffected.

#### 4. Row-gutter numbering

`RowGutterCell` computes `pageIndex * pageSize + displayIndex + 1` over a flat row model.
With group rows interleaved, that numbering is meaningless.

**Decision:** in grouped mode the gutter shows **no number on group rows** (checkbox only),
and numbers leaf rows by their position among leaves. This satisfies the architecture spec's
existing constraint that "the pinning and gutter APIs must not assume a flat-only table."

#### 5. Two aggregation models

`GroupedDataTable` has per-group aggregation (TanStack `aggregationFn` / `aggregatedCell`).
`DataTable` has footer + selection-scoped aggregation (`calculableColumns` /
`computeAggregate`, sourced from `getSelectedRowModel()`).

**Decision:** these are **orthogonal and both kept** — one renders on group rows, the other in
the table footer. No unification needed. The only care point is that footer aggregation must
source **leaf** rows (`getSelectedRowModel().flatRows` filtered to leaves) so grouped parents
don't double-count their children.

### Also resolved by the merge

- **`columnVisibility` conflict** — merged as `{ ...userVisibility, ...deriveColumnVisibility(grouping) }`,
  the fix `use-grouped-table.ts`'s own comment already specifies. Grouped dimension columns
  stay hidden while the Columns menu keeps working for the rest.
- **Auto group column pinning** — **deferred, not shipped.** The plan on this line was to
  seed the auto group column pinned-left by default, injected like the row gutter, so
  drill-down stays usable with horizontal scroll. The merged implementation
  (`buildGroupColumn` in `group-column.tsx`) sets `enablePinning: false` on the column and
  nothing seeds `columnPinning` for it — pinning the group column isn't even offered (the
  Columns menu excludes it, matching `enablePinning: false`), let alone defaulted on. Revisit
  as its own follow-up task rather than assuming it already happened.
- **`defineColumns` for grouped tables** — comes free; the CRM Pipeline block's raw-`ColumnDef`
  escape hatch can become `col.*` calls.

## Phasing

Each phase is independently shippable and independently revertable.

**Phase 0 — close the unguarded drift window.**
Extend `cross-family-parity.test.ts` to cover the duplicated 42-line filter type block
(extract-and-compare that region, rather than whole-file, since the surrounding props
legitimately differ). Small, but it protects the copies for however long Phases 1–2 take;
Phase 2 deletes it along with the duplication itself.

**Phase 1 — grouping engine into `useDataTable`, behind the new `grouping` prop.**
`GroupedDataTable` untouched and still shipping. Delivers: grouping + editing/selection/
sort/export combinations that don't exist today. Includes the `isCellEditable` generalization,
gutter changes, sub-row selection, group-column injection, visibility merge.

**Phase 2 — `GroupedDataTable` becomes a thin wrapper.**
Delete the 879 duplicated lines and the duplicated filter types/tests; retire
`cross-family-parity.test.ts`; extract `dimension-picker` as its own registry item. The
existing grouped test suites must pass unmodified — that is the gate for this phase.

**Phase 3 — deprecate, then remove.**
`GroupedDataTable` is **not** a permanent API (decision 2). Mark
`@kotsas-ui/grouped-data-table` deprecated in its registry description and docs, pointing at
`DataTable`'s `grouping` prop, ship the wrapper for one release as a migration window, then
delete the item and the wrapper outright.

Because the wrapper is transitional, it gets **no polish budget**: no new props, no new
tests of its own beyond the inherited compatibility suites, no docs page of its own beyond a
deprecation banner. Anything worth keeping belongs on `DataTable` instead.

**Phase 4 — repo rename** (decision 1). Independent of Phases 0–3; can land at any point,
but cleanest last, once the registry item names are final.

## Testing strategy

- **Compatibility contract:** the four existing grouped suites run unmodified against the
  wrapper. Any change required to those files is a regression, not a test update.
- **New combination coverage** (the point of the merge — none of these are testable today):
  editing a leaf inside a group; selecting a group row cascades to descendants; tri-state on
  partial descendant selection; keyboard nav across a group boundary; `Enter` toggles a group
  row instead of editing; CSV export of a grouped table emits leaf rows; footer aggregation
  over a grouped selection does not double-count.
- **Guard rails:** `isCellEditable` returns false for every group row id; `updateData` is never
  invoked with a synthetic group id.
- **Unchanged:** per-family `primitives.parity.test.ts` (base-ui ↔ Radix) still applies to
  `data-table` and to the new `dimension-picker` item.
- **Registry install:** each item installs from built JSON into a scratch project and
  typechecks, per the existing dual-base verification.

## Risks

| Risk | Mitigation |
|---|---|
| Regressing the shipped grouped table (live at `/accounts`, CRM Pipeline block) | Existing grouped suites pass unmodified as the Phase 2 gate; wrapper keeps the public API identical |
| `useDataTable` (603 lines) becomes unmanageable | Grouping state extracted into its own `use-grouping.ts` composed by `useDataTable`, mirroring how `use-grid-navigation` / `use-footer-aggregation` already compose |
| Flat-table consumers inherit grouping weight | `dimension-picker` (all 4 dnd-kit deps) split out; `data-table`'s npm deps unchanged; ~165 dependency-free lines is a net win against 879 removed |
| Group-row ids leaking into `updateData`/undo | Boundary assertions + explicit tests (above) |
| Big-bang breakage | Three phases; Phase 1 adds only, changes nothing existing |

## Resolved decisions (from review)

1. **Rename the repo/package to `kotsas-ui`.** `react-pivot-table` describes neither
   component — this is row grouping with drill-down, not pivoting (cross-tabulation), which
   the original design spec put explicitly out of scope. The component has been
   `GroupedDataTable` since its first commit; only the repo name disagreed. It also already
   matches the registry namespace (`@kotsas-ui/*`) and the site branding ("Kotsas UI").

   Scope is small and fully enumerated — 4 source files, plus one generated artifact:

   | File | Change |
   |---|---|
   | `package.json` | `"name": "react-pivot-table"` → `"kotsas-ui"` |
   | `components/site/github-stars.tsx` | `GITHUB_URL` + `GITHUB_API_URL` (2 occurrences) |
   | `registry.json` | `homepage` |
   | `README.md` | live-demo URL + `raw.githubusercontent.com` install snippet |
   | `public/r/registry.json` | generated — regenerate via `registry:build`, don't hand-edit |

   Also requires renaming the GitHub repo itself (GitHub keeps a redirect, so existing
   clones and the raw-URL install path keep working) and updating the Vercel project/demo
   domain. **Historical references in `docs/superpowers/plans/*` are deliberately left
   alone** — they are dated records of past work, not live config.

2. **`GroupedDataTable` does not survive long-term.** It is fully embedded into `DataTable`;
   the wrapper is a migration shim with a one-release window, then deleted (Phase 3). This
   is what justifies spending nothing on wrapper polish.

3. **Grouping stays uncontrolled — no `[state, onChange]` pair.** Recommendation, with the
   reasoning, since this was the open one:

   `useDataTable` holds **8 pieces of table state** — `sorting`, `columnVisibility`,
   `columnPinning`, `columnSizing`, `pagination`, `rowSelection`, `filterState` (and now
   `grouping`). **All 8 are uncontrolled**, with exactly two `initial*` seeds
   (`initialColumnPinning`, `initialFilterState`) and **zero controlled props anywhere on
   the component.** Adding a controlled pair for grouping alone would make it the one
   inconsistent member of that set — a worse API than either fully-controlled or
   fully-uncontrolled.

   Three further reasons to defer rather than decide now:

   - **It's non-breaking to add later.** Uncontrolled → optionally-controlled is backwards
     compatible (add `grouping.value`/`grouping.onChange`; fall back to internal state when
     absent). The reverse is breaking. Deferring costs nothing; committing early does.
   - **Escape hatches already exist** for the real use cases (URL/localStorage persistence,
     saved views): `useDataTable` returns the TanStack `table` — and will return
     `grouping`/`setGrouping` alongside `filterState`/`setFilterState`, matching the
     established shape. Consumers needing full control drop to the headless hook.
     *Caveat to document:* driving `table.setGrouping()` directly bypasses the
     normalize-against-allowed-dimensions guard, so `setGrouping` from the hook is the
     supported path.
   - **When it does come, it should be one coherent decision across all 8**, mirroring
     TanStack's own `state` + `onStateChange` pattern — not a per-feature bolt-on. That is
     its own design, not a rider on this one.

4. **No isolated Phase 0 / shared-core-only variant.** Follows from (2): since
   `GroupedDataTable` is going away, extracting a shared internal core to serve two
   permanent families would be throwaway work. Phase 0 ships only as short-lived protection
   for the duplicated copies while Phases 1–2 land, and is deleted by Phase 2.
