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
}

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
}
