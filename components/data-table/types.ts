import type * as React from "react"

/** Identifies one cell by its TanStack row id and column id. */
export type CellPos = { rowId: string; columnId: string }

/** Direction vocabulary shared with table-fields' FieldEditContext. */
export type MoveDirection = "next" | "prev" | "up" | "down"

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

/**
 * The live grid state + actions, provided via React Context so cell renderers
 * (built once per column by defineColumns) can read/act without prop-drilling.
 */
export type DataTableRuntime = {
  /** The single focused cell, or null before any cell has been clicked/tabbed to. */
  activeCell: CellPos | null
  /** The cell currently rendering its `edit` UI, or null when nothing is being edited. */
  editingCell: CellPos | null
  /** `pos === activeCell` — a convenience predicate so cell renderers don't do their own equality checks. */
  isActive: (pos: CellPos) => boolean
  /** `pos === editingCell` — same convenience as `isActive`, for the edit-mode branch. */
  isEditing: (pos: CellPos) => boolean
  /** Focuses a cell without entering edit mode (click, or arrow/Tab navigation). */
  setActiveCell: (pos: CellPos) => void
  /** Enters edit mode for `pos`; a no-op if `isColumnEditable(pos.columnId)` is false. */
  beginEdit: (pos: CellPos) => void
  /** Exits edit mode (on commit or cancel) without changing `activeCell`. */
  stopEditing: () => void
  /**
   * Moves `activeCell` one step in the given direction and exits edit mode.
   * "next"/"prev" move horizontally and wrap to the next/previous row at a row
   * edge; "up"/"down" move vertically and clamp (do not wrap) at the grid edge.
   */
  moveActive: (dir: MoveDirection) => void
  /** Resolves the column's `DataTableColumnMeta.editable` override against the table-level default (set in useDataTable). */
  isColumnEditable: (columnId: string) => boolean
  /** Reports an intended cell edit. The raw, field-supplied value — callers own coercion/validation; the library never mutates `data` itself. */
  updateData: (rowId: string, columnId: string, value: unknown) => void
  /** Wired once on the grid's root element (not per-cell) to drive arrow-key/Tab/Enter navigation of the active cell. */
  handleKeyDown: (e: React.KeyboardEvent) => void
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
   * to "none" — the row-gutter's click-cycle (a later task) owns that
   * distinction and calls the appropriate table method itself when needed.
   */
  setAllMatchingSelected: (matching: boolean) => void
  /**
   * Selects/deselects a single row by id. When `shiftKey` is true and a
   * prior call has recorded an anchor row, every row between the anchor and
   * `rowId` (inclusive, resolved by their live position in the current row
   * model) is set to `checked` instead of toggling just the one row —
   * Sheets/Gmail-style range select. Always updates the anchor to `rowId`
   * afterward, shift-click or not. Takes an id rather than a positional
   * index deliberately: TanStack's `Row.index` is fixed at row creation to
   * the row's position in the original, unsorted data, not its current
   * on-screen position, so an index captured at click time can point at the
   * wrong row (or nothing) once sorting/filtering has reordered the table.
   */
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

export type FilterType = "text" | "number" | "select" | "date"

export type FilterOperator =
  | "contains" | "doesNotContain" | "equals" | "isNot" | "startsWith"
  | "eq" | "ne" | "gt" | "lt" | "between"
  | "is" | "isAnyOf" | "isNoneOf"
  | "before" | "after" | "dateBetween"

export type FilterDef = {
  /**
   * Must match a column's `id`/`accessorKey` AND a key on the row data — the
   * filter engine reads the value via `row[id]`. Filterable columns must
   * therefore be accessorKey-based (not `accessorFn`-only).
   */
  id: string
  label: string
  type: FilterType
  /** Allowed operators; falls back to the type default when omitted. */
  operators?: FilterOperator[]
  /** Required for type "select" — the choosable values. */
  options?: { label: string; value: string }[]
}

export type FilterValue =
  | string
  | number
  | [number, number]
  | [string, string]
  | string[]
  | null

export type FilterCondition = {
  /** Unique id for keying / removal. */
  id: string
  columnId: string
  operator: FilterOperator
  value: FilterValue
}

export type Combinator = "and" | "or"
export type FilterGroup = { id: string; combinator: Combinator; conditions: FilterCondition[] }
export type FilterState = { combinator: Combinator; groups: FilterGroup[] }

/** One developer-configured entry in the Actions dropdown. */
export type DataTableAction<TData> = {
  /** Unique id for keying. */
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  /** Disable this action (e.g. based on selection state); defaults to enabled. */
  disabled?: boolean
  variant?: "default" | "destructive"
  /**
   * `rowIds`/`rows` are the selected rows that exist client-side. When
   * `allMatching` is true (manual pagination, the select-all cycle advanced
   * to "every row matching the filter"), the logical selection exceeds what's
   * loaded — `rows` covers only the loaded subset, and the action should run
   * its own server-side bulk path (mirroring how `computeAggregate` handles
   * the same scope for footer aggregation) rather than iterating `rows`.
   */
  onClick: (context: { rowIds: string[]; rows: TData[]; allMatching: boolean }) => void
}
