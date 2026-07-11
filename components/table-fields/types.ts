import type { CellContext } from "@tanstack/react-table"
import type * as React from "react"

/** A label/value pair for choice fields (single/multi select). */
export type SelectOption = { label: string; value: string }

/**
 * The TanStack table `meta` channel editable cells use to persist a change.
 * Provided by the DataTable shell (Plan 2); display-only usage ignores it.
 */
export type EditableTableMeta = {
  updateData?: (rowId: string, columnId: string, value: unknown) => void
}

/**
 * Runtime context a field's `edit` renderer receives. Declared here so field
 * types are self-describing, but no `edit` renderer is implemented in this
 * package — the grid spine that provides this context lives in `data-table`.
 */
export type FieldEditContext<V> = {
  value: V
  setValue: (next: V) => void
  commit: () => void
  cancel: () => void
  focusNext: (dir: "next" | "prev" | "up" | "down") => void
}

/** Binds a value type V to display + metadata + clipboard (de)serialization. */
export type FieldType<V> = {
  name: string
  icon: React.ComponentType<{ className?: string }>
  align?: "left" | "right" | "center"
  /** Pure display renderer — usable standalone as a ColumnDef cell. */
  display: (ctx: CellContext<unknown, V>) => React.ReactNode
  /** Optional edit renderer; implemented in `data-table` (Plan 2), not here. */
  edit?: (ctx: FieldEditContext<V>) => React.ReactNode
  /** Serialize a value to a clipboard/CSV cell string. */
  toClipboard: (value: V) => string
  /** Parse a clipboard/CSV cell string back to a value (undefined if invalid). */
  fromClipboard: (text: string) => V | undefined
}
