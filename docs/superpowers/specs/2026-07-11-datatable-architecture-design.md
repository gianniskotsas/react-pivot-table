# kotsas-ui DataTable Architecture — Release 1 Design

**Date:** 2026-07-11
**Status:** Approved for planning (rev. 2 — editable-grid scope)
**Author:** brainstormed with Giannis

## Goal

Evolve `kotsas-ui` from a single specialized `grouped-data-table` into a **three-tier
editable data-grid family** for shadcn + TanStack Table v8 — an open-source,
copy-paste, shadcn-native answer to the Airtable/Notion grid, which today's mature grids
(AG Grid, Glide, Material React Table) don't offer in a shadcn-idiomatic form. This is the
adoption wedge: not "another data table with nice cells," but a **genuinely good editable
grid you paste into a shadcn app**.

Release 1 delivers a general-purpose base `DataTable` with a real grid interaction spine
(cell focus, keyboard navigation, edit lifecycle), a modular + type-safe field-type kit,
row selection with calculation summaries, hide/freeze/sort/resize columns, undo-redo with
toasts, copy/paste/export, and a hybrid client/server aggregation model. Formula, AI,
attachment, and relational field types are deferred to R2+; the docs-site rebuild is a
separate brainstorm cycle.

## Context / current state

The repo ships one registry component, `grouped-data-table` (base-ui + Radix builds):
grouping / pivot drill-down, AND/OR filter groups, dimension picker, per-group
aggregation, client pagination. It has **no** field-type system, **no** editing, **no**
row selection, **no** sorting UI, **no** column hide/freeze/resize, **no** footer calc,
**no** formatting helpers. Consumers hand-write every `ColumnDef.cell`.

The grouped table establishes the pattern we mirror: the **developer declares what is
allowed** (`groupableDimensions`, `filterableColumns`) and the **user's live choices are
separate state** (`grouping`, `filterState`).

## Success criteria

1. **Editable grid, dev-gated** — cells edit inline with real grid keyboard navigation;
   editing is **off by default** and enabled per-table and/or per-column. A read-only
   table is a first-class, zero-config mode.
2. **Type-safe end to end** — a typed column builder ties each column's accessor to its
   data type to its field type; `updateData` is typed per column; wrong pairings are
   compile errors.
3. **Standalone field types** — every field type's display renderer is usable in a plain
   shadcn/TanStack table with **no** dependency on `DataTable`.
4. **Base is a superset** — `DataTable` covers everything the current grouped table's
   non-grouping base does, so `grouped-data-table` can later sit on it without loss.
5. **Zero-backend by default** — selection summary, footer calc, sorting, and undo/redo
   work fully client-side; large-dataset aggregation **degrades gracefully** to a
   developer callback. The library never fetches.
6. **Adoption-ready** — each feature ships with tests and one doc page; installs via the
   existing shadcn registry (base-ui + Radix builds, parity test preserved).

## Non-goals (Release 1)

- Formula / AI-computed / attachment-upload cells (R2+, but the async cell shape is
  anticipated in the contract).
- Relational types (Linked record, Lookup, Rollup) and identity types (Created/Modified
  By, User ownership), barcode, autonumber auto-increment.
- Full spreadsheet range paste with formula-fill; R1 does rectangular value paste only.
- Docs-site rebuild; refactoring `grouped-data-table` onto `DataTable` (later release).

---

## Architecture — three registry tiers

```
@kotsas-ui/table-fields         field types: display + edit renderers, type-safe (Layer 0)
        ▲ registryDependency
@kotsas-ui/data-table           base DataTable<TData>: grid spine + shell features (Layer 1)
        ▲ (future) extends
@kotsas-ui/grouped-data-table   existing grouping/pivot table (unchanged this release)
```

Each tier is an independent registry item, composed via `registryDependencies`. All new
components ship **base-ui and Radix builds** using the established
`primitives.tsx` / `primitives.radix.tsx` shim + parity test.

### Tier 1 — `table-fields` (modular, type-safe field kit)

**Dependencies:** `@tanstack/react-table` (types) + shadcn primitives only. No dnd-kit,
no `DataTable`. This is what keeps field types usable in anyone's table.

**The field-type contract.** A field type binds a value type `V` to a display renderer, an
optional edit renderer, a header icon, and clipboard (de)serialization:

```ts
export type FieldType<V> = {
  name: string
  icon?: React.ComponentType<{ className?: string }>       // Airtable-style header icon
  align?: "left" | "right" | "center"
  display: (ctx: CellContext<any, V>) => React.ReactNode   // pure, standalone-usable
  edit?: (ctx: FieldEditContext<V>) => React.ReactNode      // omit → type is never editable
  toClipboard?: (value: V) => string                        // for copy + CSV/TSV export
  fromClipboard?: (text: string) => V | undefined           // for paste
}

export type FieldEditContext<V> = {
  value: V
  setValue: (next: V) => void   // stages the value
  commit: () => void            // Enter / blur — persists via the table's updateData
  cancel: () => void            // Esc — reverts
  focusNext: (dir: "next" | "prev" | "up" | "down") => void
}
```

**Two consumption paths, one implementation:**

- **Standalone (read-only):** each field also exports a plain cell factory that is just
  its `display` renderer, returning a `ColumnDef["cell"]` — drop-in for any table:
  ```ts
  { accessorKey: "amount", header: "Amount", cell: currencyCell({ currency: "USD" }) }
  ```
- **Full grid:** `DataTable` consumes the whole `FieldType<V>` (display + edit + icon +
  clipboard) via the typed column builder below.

**Editing uses TanStack's standard `meta.updateData` convention** — the edit context's
`commit()` calls `table.options.meta.updateData(rowId, columnId, value)`. So an editable
kotsas-ui field works in any table whose author wires that idiomatic meta channel.

**Release 1 field set (Families 1–4, ~15 types).** Each has a header icon and, where
marked, an edit renderer:

| Family | Types | Editable | Value type |
|---|---|---|---|
| Number (Intl) | number, currency, percent, duration | ✓ (numeric input) | `number` |
| Text | text, longText, url, email, phone | ✓ (text / textarea) | `string` |
| Choice | singleSelect, multiSelect, checkbox | ✓ (select / MultiSelect / toggle) | `string` / `string[]` / `boolean` |
| Widget | rating, button, date | rating ✓, date ✓ (calendar), button = action | `number` / `Date`\|`string` |

url/email/phone display as click-through links (`target=_blank`, `mailto:`, `tel:`);
their edit renderer is a plain text input. `multiSelect` reuses the existing `MultiSelect`
component. Every editable field respects the per-column/table read-only gate (below): when
not editable, only `display` is ever rendered.

### Tier 2 — `data-table` (base grid shell)

`DataTable<TData>` owns the grid spine + shell features and the **type-safe Layer-1
column builder**.

**Type-safe column builder.** The recommended API (resolves the earlier open ergonomics
question in favor of type safety): a builder that constrains accessor → data type → field
type at compile time.

```ts
const columns = defineColumns<Employee>()([
  col.text("name",        { header: "Name" }),        // "name" must be a string key
  col.number("age",       { header: "Age" }),
  col.email("email"),                                  // must be a string key
  col.url("website",      { header: "Website" }),
  col.longText("notes"),
  col.currency("salary",  { header: "Salary", currency: "USD", editable: false }),
  col.singleSelect("department", { options: DEPARTMENTS }),
])
```

- `col.number("age")` fails to compile unless `Employee["age"]` is `number`.
- Per-column `editable?: boolean` overrides the table default (`DataTable editable?: boolean`,
  default `false`). Read-only is the safe default.
- `updateData` is typed: `updateData<K extends keyof TData>(rowId: string, key: K, value: TData[K])`.
- Raw `ColumnDef` remains an escape hatch alongside builder columns.

---

## The grid interaction spine (the core new primitive)

TanStack is headless and provides none of this; it is the foundation every field type and
shell feature builds on, so it lands first.

- **Cell focus model** — a single "active cell" (`{rowId, columnId}`) in table state, with
  a visible focus ring. Click focuses; click-again (or Enter) enters edit mode.
- **Keyboard navigation** — Arrow keys move the active cell; Tab / Shift-Tab move
  horizontally and wrap; Enter commits an edit and moves down; Esc cancels; typing on a
  focused editable cell enters edit mode with the character. Home/End, PageUp/Down optional.
- **Edit lifecycle** — display → (enter) edit → commit(persist via `updateData`) | cancel.
  The `FieldEditContext` above is the contract each field's `edit` renderer implements.
- **Read-only gate** — when the table or column is not editable, cells are focusable and
  copyable but never enter edit mode.

This spine is a small headless hook (`use-grid-navigation.ts`) plus focus/keydown wiring
in the cell/row components — independently testable with fired key events.

## Editing, type safety & data ownership

- The library **never owns the data**; it renders `data` and reports intended mutations
  through `updateData`. The consumer applies them (optimistic local state, server write,
  whatever) — the same boundary as the AI/aggregate callbacks.
- `editable` resolves table-default → column-override. A fully read-only grid passes
  nothing and gets focus/keyboard/copy/sort/select but no edit affordances.
- Type safety is enforced at the builder boundary (accessor/value/field alignment) and at
  `updateData` (typed value per column), giving compile-time guarantees end to end.

## Undo / redo + notifications (sonner)

- **Edit history stack** at the `DataTable` level. Every mutation (single edit, paste,
  bulk clear) pushes an inverse op `{ rowId, columnId, prev, next }` (or a batch).
- **Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo.** Undo re-issues `updateData` with the prior
  value(s) — so it works entirely through the existing mutation contract; no data ownership.
- **sonner toasts** (`sonner` added as a dependency; shadcn's standard toast) for:
  undo/redo ("Change undone" with a Redo action button), bulk paste ("Pasted 12 cells"),
  bulk clear, and export/copy confirmations. A `<Toaster />` is documented as a one-time
  app-root add; the components call `toast(...)`.
- Undo scope is **data edits only** (not view state like sort/filter/column changes),
  matching Airtable/Sheets behavior.

## Copy / paste / export

- **Copy** — copy the active cell or the selected rows/range to the clipboard as TSV
  (Excel/Sheets-pasteable) via each field's `toClipboard`. Read-only tables still copy.
- **Paste** — in editable mode, rectangular TSV paste starting at the active cell, mapped
  through `fromClipboard`, committed as one undoable batch (one toast). Range paste with
  formula-fill is out of scope for R1.
- **Export** — a toolbar action exporting the current view to **CSV** (respects column
  visibility, sort, and filters; optionally scoped to the selection). `exportCsv(rows,
  columns)` is a pure, tested util. JSON export is a trivial add flagged optional.

## Columns control — sort, hide, freeze, resize

A per-column header menu (caret in the screenshot) plus a "Columns" popover:

- **Sort** — click header or menu → asc/desc/none, TanStack `sorting` state; multi-sort
  with Shift optional. (Glaring omission in rev. 1; now core.)
- **Hide** — two-way `columnVisibility` (`onColumnVisibilityChange` wired), merged cleanly
  with any grouping-derived rules.
- **Freeze/pin** — TanStack `columnPinning`; sticky CSS with computed left/right offsets
  and an edge shadow. The fiddliest piece; focused tests on offset math + z-index.
- **Resize** — TanStack `columnSizing`; drag the header edge. Persisted in table state.

Per-column opt-outs: `enableSorting`, `enableHiding`, `enablePinning`, `enableResizing`.

## Row-number gutter + selection

- **Excel-style gutter** — a leading gutter column showing the 1-based row number within
  the current sorted/filtered view (continuous across pages via the pagination offset).
- **Hover-to-checkbox** — on row hover (or when the row is selected), the number swaps to
  the selection checkbox; otherwise the number shows. Matches the reference screenshot.
- **Stable identity** — `getRowId` is required for selection to survive pagination, sort,
  and refetch; the builder defaults it to a configurable `id` key and documents it. This
  is the linchpin for select-all-matching and undo targeting.

**Tri-state select-all** (header gutter checkbox):

```
none ──click──▶ page  (header shows "–" when more rows exist beyond the page/filter)
page ──click──▶ all-matching  (every row in the dataset, or the filtered subset)
all-matching ──click──▶ none
```

- When the whole result fits on one page, it collapses to a normal two-state checkbox.
- `all-matching` is a **logical selection** (a predicate + filter context), not a
  materialization of every id — the standard "select across pages" approach. Bulk actions
  and aggregations over `all-matching` use the client rows when fully loaded, else the
  server callbacks below.

## Footer calc + selection summary (Option C, per-column opt-in)

Persistent per-column footer that switches to selection scope when rows are selected.

- **Dev declares** `calculableColumns: { columnId, methods?, default? }[]`
  (`AggregationMethod = "sum" | "avg" | "min" | "max" | "count"`).
- **User controls** live `footerAggregations: Record<columnId, AggregationMethod | null>`
  (off by default; click a footer cell → pick a method).
- **Scope** — no selection → all visible (filtered) rows; selection active → selected rows
  (including `all-matching`). Display reuses the column's field formatter.
- `aggregate(method, values) => number` is a pure, independently tested module shared by
  both scopes and the server path.

## Hybrid client/server aggregation

The library computes what it can from memory and delegates the rest; it never fetches.

```ts
manualPagination?: boolean
totalRowCount?: number        // total rows matching current filters (server-known)
computeAggregate?: (args: {
  columnId: string
  method: AggregationMethod
  scope: "all-matching" | "selection-all-matching"
  filters?: unknown
}) => Promise<number>
```

- All matching rows loaded (`!manualPagination` or `totalRowCount <= loadedRowCount`) →
  compute client-side, instant.
- `all-matching` scope **and** `totalRowCount > loadedRowCount` → the value isn't in
  memory → footer cell shows a **Calculate** trigger:
  - `computeAggregate` provided → run it (state machine below).
  - not provided → **graceful fallback** to loaded rows only, with a subtle "(loaded rows)"
    qualifier so the number is never silently wrong.
- **Aggregate cell state machine** (reused by R2 Formula/AI cells):
  `idle → loading → value(server) → stale(inputs changed) | error(retry)`.

---

## Component / unit breakdown

**`table-fields`**
- `types.ts` — `FieldType<V>`, `FieldEditContext<V>`, `SelectOption`, `EditableTableMeta`.
- `number-fields.tsx`, `text-fields.tsx`, `choice-fields.tsx`, `widget-fields.tsx` — the
  field types (display + edit + icon + clipboard) and their standalone cell factories.
- `format.ts` — pure `Intl` formatters shared by number fields and footer display.
- `icons.ts` — header type icons.

**`data-table`**
- `data-table.tsx` — `DataTable<TData>` composition root.
- `use-data-table.ts` — headless hook: TanStack state (selection, sorting, visibility,
  pinning, sizing, pagination) + active-cell + footer-aggregation + undo/redo stack.
- `use-grid-navigation.ts` — focus model + keyboard navigation + edit lifecycle.
- `define-columns.ts` — type-safe builder: `defineColumns` + `col.*` → `ColumnDef`.
- `columns-menu.tsx`, `column-header.tsx` — sort/hide/pin/resize UI + header icon.
- `row-gutter.tsx` — row numbers, hover-to-checkbox, tri-state select-all, banner.
- `footer-aggregation.tsx` — footer cells, method picker, scope + server trigger.
- `clipboard.ts` — copy/paste TSV mapping; `export-csv.ts` — CSV export util.
- `undo.ts` — history stack + inverse ops + sonner integration.
- `aggregate.ts` — pure `aggregate(method, values)` + `AggregateState`.
- `primitives.tsx` / `primitives.radix.tsx` — base-ui/Radix shim.
- `types.ts`, `index.ts` — public surface.

## Testing strategy

- **Pure logic:** `aggregate()`, CSV export, TSV copy/paste mapping, undo inverse-op
  correctness, tri-state select-all transitions, server-vs-client decision predicate,
  sticky-offset math, `defineColumns` type-level tests (tsd / `expect-type`).
- **Field renderers:** each field displays correctly; edit renderers stage/commit/cancel
  and call `updateData` with typed values; url/email/phone hrefs; clipboard round-trips.
- **Grid spine:** fired key events move the active cell, enter/commit/cancel edit, respect
  the read-only gate.
- **Shell:** sort/hide/pin/resize; row-number↔checkbox hover swap; tri-state select-all +
  banner; footer scope switch on selection; `computeAggregate` args + loading/error/stale
  + graceful fallback; undo/redo + toast calls (mock sonner).
- **Variant parity:** extend the parity test to new `*.radix.tsx` shims.
- **Registry install:** each tier installs from built JSON into a scratch project and
  typechecks (base-ui + Radix), per the shipped dual-base verification.

## Distribution & dependencies

- Registry items: `table-fields`, `data-table` (+ `-radix` variants), built via
  `pnpm registry:build`, self-hosted at `ui.kotsas.com` + GitHub raw, `@kotsas-ui`
  namespace. `data-table` lists `table-fields` in `registryDependencies`.
- New npm dependency: **`sonner`** (toasts) on `data-table`. `data-table` also declares the
  shadcn `sonner`/`toast` registry item so `<Toaster />` is available; docs show the
  one-time app-root setup. No other new runtime deps (clipboard via `navigator.clipboard`,
  CSV hand-rolled).

## Suggested build order (likely two implementation plans)

Given the size, plan this as two sequential cycles:

1. **`table-fields`** — the `FieldType` contract + all 15 fields (display + edit +
   clipboard + icons) + formatters. No shell dependency; independently shippable and the
   standalone-adoption unlock.
2. **`data-table`** — grid spine first (focus/keyboard/edit), then the shell features
   (selection + gutter + tri-state, sort/hide/pin/resize, footer calc + hybrid
   aggregation, undo/redo + sonner, copy/paste/export), then the typed `defineColumns`
   builder tying it together.

## Open questions (settle during planning, not blockers)

1. **Multi-sort** — ship Shift-click multi-column sort in R1 or single-sort only?
2. **Paste extent** — confirm rectangular value paste only for R1 (no formula-fill), and
   whether paste may create rows or only fill existing ones.
3. **Export formats** — CSV confirmed; include JSON in R1 or defer?
4. **Duration formatting** — default unit display (h/m/s vs ms) and optional format token.
5. **Pinned/grouped interaction** — deferred with the grouped-table refactor; the pinning
   and gutter APIs must not assume a flat-only table.
