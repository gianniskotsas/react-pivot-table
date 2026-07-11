# kotsas-ui DataTable Architecture — Release 1 Design

**Date:** 2026-07-11
**Status:** Approved for planning
**Author:** brainstormed with Giannis

## Goal

Evolve `kotsas-ui` from a single specialized `grouped-data-table` into a **three-tier
data-table family** that brings Airtable-style richness to shadcn + TanStack Table v8,
optimized for **open-source adoption**: every piece is copy-paste installable, works
standalone, and is documented for humans and coding agents.

Release 1 delivers a general-purpose base `DataTable` plus a modular field-type kit,
row selection with calculation summaries, hide/freeze columns, and a hybrid
client/server aggregation model. Formula, AI, attachment, and relational field types
are explicitly deferred to R2+; the docs-site rebuild is a separate brainstorm cycle.

## Context / current state

The repo currently ships one registry component, `grouped-data-table` (base-ui + Radix
builds), providing row grouping / pivot drill-down, AND/OR filter groups, a dimension
picker, per-group aggregation, and client pagination. It has **no** field-type system:
consumers hand-write every `ColumnDef.cell`. There is no row selection, no
user-facing column hide/freeze, no footer calc, and no number/currency formatting
helpers.

The grouped table already establishes a key pattern we will mirror everywhere: the
**developer declares what is _allowed_** (`groupableDimensions`, `filterableColumns`)
and the **end-user's live choices are separate state** (`grouping`, `filterState`).

## Success criteria

1. **Standalone field types** — every field type is installable and usable in a plain
   shadcn/TanStack table (the official `useReactTable` + `<Table>` recipe), with **no**
   dependency on `DataTable` or `grouped-data-table`.
2. **Base is a superset** — `DataTable` cleanly covers everything the current grouped
   table's non-grouping base does (pagination, filtering, formatting), so
   `grouped-data-table` can later be refactored to sit on it without behavior loss.
3. **Zero-backend by default** — footer calc + selection summary work fully client-side
   with no server, and **degrade gracefully** to a developer callback for datasets
   larger than what is loaded in memory. The library never performs a fetch itself.
4. **Adoption-ready** — each feature ships with tests and one documentation page;
   installs via the existing shadcn registry (base-ui + Radix builds preserved).

## Non-goals (Release 1)

- Formula cells, AI-computed cells, attachment/file-upload cells.
- Relational field types (Linked record, Lookup, Rollup) — these require a multi-table
  data model that a single-table UI library should not own.
- Identity-dependent types (Created/Modified By, User/Collaborator ownership), barcode
  scanning, autonumber auto-increment-on-insert (a data-layer concern).
- The docs-site rebuild (`llms.txt`, copy-page, evilcharts-style) — brainstormed next.
- Refactoring `grouped-data-table` onto `DataTable` — planned, but a later release.

---

## Architecture — three registry tiers

```
@kotsas-ui/table-fields         pure TanStack cell renderers (Layer 0)
        ▲ registryDependency
@kotsas-ui/data-table           base DataTable<TData> (Layer 1 + shell features)
        ▲ (future) extends
@kotsas-ui/grouped-data-table   existing grouping/pivot table (unchanged this release)
```

Each tier is an independent registry item (like today's `grouped-data-table` /
`grouped-data-table-radix`). Tiers compose via `registryDependencies`, not duplication.
All new components ship **base-ui and Radix builds**, using the same
`primitives.tsx` / `primitives.radix.tsx` shim pattern already established in the repo,
with the parity test guarding type-signature drift.

### Tier 1 — `table-fields` (the modular kit)

Pure, self-contained cell renderers. **Dependencies:** `@tanstack/react-table` (types)
+ shadcn primitives only (`Badge`, `Checkbox`, `Button`, `Input`, `Select`, etc.). No
dnd-kit, no filter-utils, no `DataTable`. This is what makes field types usable in
anyone's hand-rolled table.

**Layer 0 — cell factories.** Each factory takes field config and returns a plain
`ColumnDef["cell"]` renderer:

```ts
import type { CellContext } from "@tanstack/react-table"

export function currencyCell<TData>(opts?: {
  currency?: string   // default "USD"
  locale?: string     // default "en-US"
}) {
  return ({ getValue }: CellContext<TData, number>) =>
    new Intl.NumberFormat(opts?.locale ?? "en-US", {
      style: "currency",
      currency: opts?.currency ?? "USD",
    }).format(getValue())
}
```

Consumed directly in any table:

```ts
const columns: ColumnDef<Invoice>[] = [
  { accessorKey: "amount", header: "Amount", cell: currencyCell({ currency: "USD" }) },
  { accessorKey: "status", header: "Status", cell: singleSelectCell({ options: STATUS_OPTIONS }) },
  { accessorKey: "site",   header: "Website", cell: urlCell() },
]
```

**Editable cells** rely on TanStack's standard editable-data convention — the table's
`meta.updateData(rowIndex, columnId, value)` — rather than any kotsas-specific channel:

```ts
export type EditableTableMeta = {
  updateData?: (rowIndex: number, columnId: string, value: unknown) => void
}
// inside an editable cell:
//   const meta = table.options.meta as EditableTableMeta | undefined
//   meta?.updateData?.(row.index, column.id, next)
```

An editable kotsas-ui cell therefore works in any table whose author wires that
(already-idiomatic) meta convention. Display-only cells ignore it.

**Release 1 field set (Families 1–4):**

| Family | Types | Editable? | Notes |
|---|---|---|---|
| Number (Intl) | `numberCell`, `currencyCell`, `percentCell`, `durationCell` | display (R1) | thin wrappers over `Intl.NumberFormat`; duration formats h/m/s |
| Linked text | `textCell`, `longTextCell`, `urlCell`, `emailCell`, `phoneCell` | display (R1) | url→`<a target=_blank rel=noreferrer>` truncated; email→`mailto:`; phone→`tel:` |
| Choice | `singleSelectCell`, `multiSelectCell`, `checkboxCell` | **editable** | reuse the existing `MultiSelect` from grouped-data-table as the multi editor; badges for display |
| Widget | `ratingCell`, `buttonCell`, `dateCell` | rating+date editable; button interactive | rating = star row; button = dev-supplied `onClick(row)`; date display via Intl, edit via shadcn calendar/date picker |

"Editable (R1)" scope: number/text families render display-first in R1 (inline edit is a
fast-follow, not a blocker); choice + rating + date ship with inline edit because their
value is the differentiator. Every factory accepts an optional `editable` opt so the
edit path can be enabled uniformly later without an API break.

### Tier 2 — `data-table` (the base shell)

`DataTable<TData>` is the general-purpose table. It owns the shell features (selection,
columns control, footer calc, pagination) and a **Layer 1 declarative surface** over the
Layer-0 field factories.

**Layer 1 — declarative field columns.** Instead of hand-writing `cell:`, a column may
declare a `field`, which `DataTable` expands to a `ColumnDef` using the same Layer-0
renderer:

```ts
// Recommended shape (final ergonomics settled in the plan):
type FieldSpec =
  | { type: "number";   locale?: string; maximumFractionDigits?: number }
  | { type: "currency"; currency?: string; locale?: string }
  | { type: "percent";  locale?: string }
  | { type: "duration"; unit?: "hms" | "ms" }
  | { type: "text" } | { type: "longText" }
  | { type: "url" } | { type: "email" } | { type: "phone" }
  | { type: "singleSelect"; options: SelectOption[] }
  | { type: "multiSelect";  options: SelectOption[] }
  | { type: "checkbox" }
  | { type: "rating"; max?: number }
  | { type: "button"; label: string; onClick: (row: TData) => void }
  | { type: "date"; withTime?: boolean; locale?: string }

type DataTableColumn<TData> =
  | ColumnDef<TData, unknown>                                  // escape hatch: raw def
  | { id: string; header?: React.ReactNode; accessorKey?: keyof TData
      field: FieldSpec; enableHiding?: boolean; enablePinning?: boolean }
```

One implementation, two consumption styles: full-table users get ergonomics; standalone
users import the Layer-0 factory. The `field` union is the single source of truth that
also informs formatting used by footer aggregation display.

### Tier 3 — `grouped-data-table` (unchanged in R1)

No changes this release. A later release refactors it to consume `DataTable` as its base;
the design keeps `DataTable`'s feature props additive so that refactor is non-breaking.

---

## Feature: Row selection + select-all

- Backed by TanStack native `rowSelection` state + a leading checkbox column
  (`enableRowSelection`). `DataTable` prop `enableRowSelection?: boolean`.
- **Header select-all** toggles all rows on the **current page** (TanStack
  `getToggleAllPageRowsSelectedHandler`).
- **Select-all-matching banner**: when the table is server-paginated (see below) and
  more rows match than are loaded, a banner appears after page-select — "All N on this
  page selected · Select all M matching" — which sets a `selectAllMatching` boolean plus
  the current filter context. It does **not** materialize M row ids in memory (the
  standard "select across pages" pattern).
- Selection integrates with footer calc (below): when a selection is active, footer
  cells show the **selection-scoped** value instead of the all-rows value.

## Feature: Columns control (hide + freeze)

A single "Columns" menu (popover) listing every hideable/pinnable column with actions:
show/hide toggle, pin-left, pin-right, unpin.

- **Hide** — two-way `columnVisibility` state (`onColumnVisibilityChange` wired). Note:
  `grouped-data-table` currently derives visibility one-way from grouping; `DataTable`'s
  visibility is user-driven and must merge cleanly with any derived rules.
- **Freeze/pin** — TanStack native `columnPinning` state; rendering applies sticky CSS
  (`position: sticky`, left/right offsets computed from pinned column widths) so pinned
  columns stay fixed during horizontal scroll. Pinned column shadows indicate the frozen
  edge. This is the fiddliest piece of R1 (sticky offset math + z-index) and warrants
  focused tests.

Dev opt-in per column via `enableHiding` / `enablePinning` (default: allowed for
non-essential columns; the selection checkbox column and a pinned group column are not
user-hideable).

## Feature: Footer calc + selection summary (Option C)

Airtable-real behavior: a persistent per-column footer that switches to selection scope
when rows are selected. **Per-column opt-in**, mirroring the declare-vs-state pattern.

**Developer declares** which columns may calculate and with which methods:

```ts
type AggregationMethod = "sum" | "avg" | "min" | "max" | "count"

type CalculableColumn = {
  columnId: string
  methods?: AggregationMethod[]   // allowed methods; default: all numeric methods
  default?: AggregationMethod     // optional preselected method (else off)
}

// DataTable prop:
calculableColumns?: CalculableColumn[]
```

**User controls** which are on and with which method (separate live state, off by default):

```ts
type FooterAggregationState = Record<string /*columnId*/, AggregationMethod | null>
// DataTable props: footerAggregations?, onFooterAggregationsChange?
```

- Footer cell renders empty until the user clicks it and picks a method (Airtable-style).
- Scope resolution: **no selection** → aggregate over all **visible (filtered)** rows;
  **selection active** → aggregate over the **selected** rows. Same primitive, different
  row-set.
- Display formatting reuses the column's `field` formatter (a currency column's sum
  renders as currency).
- The aggregation engine is a small pure module: `aggregate(method, values) => number`,
  independently testable, shared by both scopes and by the server path below.

## Feature: Hybrid client/server aggregation

The library computes what it can from memory, detects when it cannot, and delegates the
rest to a developer callback. **The library never fetches.**

**Server-pagination signal.** `DataTable` accepts:

```ts
manualPagination?: boolean        // dev drives pagination server-side
totalRowCount?: number            // total rows matching current filters, server-known
computeAggregate?: (args: {
  columnId: string
  method: AggregationMethod
  scope: "all-matching" | "selection-all-matching"
  filters?: unknown               // current filter context, opaque to the library
}) => Promise<number>
```

**Resolution logic:**

- If all matching rows are loaded (`!manualPagination` or
  `totalRowCount <= loadedRowCount`) → compute **client-side**, instantly, as above.
- If `selectAllMatching` is active (or footer scope is all-matching) **and**
  `totalRowCount > loadedRowCount` → the value cannot be computed from memory. The footer
  cell shows a **Calculate** trigger instead of a number.
  - If `computeAggregate` is provided → clicking runs it; states below.
  - If not provided → **graceful fallback**: aggregate the loaded/selected rows only,
    with a subtle "(loaded rows)" qualifier so the number is never silently wrong.

**Aggregate cell state machine** (also reused for Formula/AI cells in R2):

```
idle → loading → value(server-computed)
                     ↘ stale (filters/selection changed → offer recompute)
                     ↘ error (show message + retry)
```

This keeps the async/stateful cell shape in the architecture from day one, so R2's
Formula and AI fields slot in without reworking the cell contract.

---

## Component / unit breakdown

New units, each with one responsibility and a well-defined interface:

**`table-fields` package**
- `number-cells.tsx` — `numberCell`, `currencyCell`, `percentCell`, `durationCell`.
- `text-cells.tsx` — `textCell`, `longTextCell`, `urlCell`, `emailCell`, `phoneCell`.
- `choice-cells.tsx` — `singleSelectCell`, `multiSelectCell`, `checkboxCell` (editable).
- `widget-cells.tsx` — `ratingCell`, `buttonCell`, `dateCell`.
- `types.ts` — `SelectOption`, `EditableTableMeta`, shared cell option types.
- `format.ts` — pure `Intl` formatter helpers shared by number cells and footer display.

**`data-table` package**
- `data-table.tsx` — the `DataTable<TData>` shell (composition root).
- `use-data-table.ts` — headless hook wiring TanStack state (selection, visibility,
  pinning, pagination) + footer aggregation state.
- `field-columns.ts` — Layer-1 `FieldSpec` → `ColumnDef` expansion (delegates to Layer-0).
- `columns-menu.tsx` — hide/freeze popover.
- `selection-column.tsx` — leading checkbox column + select-all-matching banner.
- `footer-aggregation.tsx` — footer cells, method picker, scope resolution, server trigger.
- `aggregate.ts` — pure `aggregate(method, values)` engine + `AggregateState` type.
- `primitives.tsx` / `primitives.radix.tsx` — base-ui/Radix shim (as established).
- `types.ts`, `index.ts` — public surface.

## Testing strategy

- **Pure logic (unit):** `aggregate()` (each method, empty set, non-numeric guards),
  `FieldSpec → ColumnDef` expansion, formatter helpers, sticky-offset math, select-all
  scope resolution, server-vs-client decision predicate. Vitest, no DOM.
- **Cell renderers (component):** each Layer-0 cell renders expected output for a given
  value; editable cells call `meta.updateData` with the right args; url/email/phone
  produce correct `href`s. Testing Library + jsdom (portal-less assertions, per the
  repo's base-ui jsdom constraints).
- **Shell (component):** columns menu toggles visibility/pinning; footer picker sets
  method; selection switches footer scope; `computeAggregate` is called with the right
  args and its loading/error/stale states render; graceful fallback when absent.
- **Variant parity:** extend the existing parity test to any new `*.radix.tsx` shim.
- **Registry install:** each new tier installs from its built JSON into a scratch project
  and typechecks (base-ui + Radix), same as the shipped dual-base verification.

## Distribution

Three registry items (`table-fields`, `data-table`, and their `-radix` variants),
built via `pnpm registry:build`, self-hosted at `ui.kotsas.com` and GitHub raw, with the
`@kotsas-ui` namespace. `data-table` lists `table-fields` in `registryDependencies`;
both keep the base-ui/Radix twin + parity-test discipline.

## Open questions (settle during planning, not blockers)

1. **Layer-1 column ergonomics** — `field: FieldSpec` object (above) vs. builder helpers
   (`field.currency({...})`). Both expand to the same Layer-0 renderer; pick the one that
   reads best against the existing `groupColumn`/`filterableColumns` style.
2. **Inline-edit depth in R1** — confirmed editable: choice, rating, date. Open: whether
   number/text inline edit lands in R1 or the immediate follow-up.
3. **Duration formatting** — default unit display (h/m/s vs. ms) and whether to accept a
   format token string.
4. **Pinned + grouped interaction** — deferred with the grouped-table refactor, but note
   the pinning API must not assume a flat table.
