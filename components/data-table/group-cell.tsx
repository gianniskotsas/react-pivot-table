"use client"

import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { flexRender, type Cell, type Row } from "@tanstack/react-table"

import { cn } from "@/lib/utils"

import { getGroupRowCount } from "./grouping-utils"
import { ROW_GUTTER_COLUMN_ID } from "./row-gutter"
import { GROUP_COLUMN_ID, type GroupColumnConfig } from "./types"

export type GroupAwareCellProps<TData> = {
  cell: Cell<TData, unknown>
  groupColumn: GroupColumnConfig<TData>
}

/**
 * Leaf content precedence: `renderLeaf` (full control) → declarative `leaf`
 * (icon?/primary/secondary?) → nothing.
 */
function renderLeafContent<TData>(
  row: Row<TData>,
  groupColumn: GroupColumnConfig<TData>,
): React.ReactNode {
  if (groupColumn.renderLeaf) return groupColumn.renderLeaf(row)

  const leaf = groupColumn.leaf
  if (!leaf) return null

  const icon = leaf.icon?.(row)
  const secondary = leaf.secondary?.(row)
  return (
    <div className="flex min-w-0 items-center gap-2">
      {icon}
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{leaf.primary(row)}</span>
        {secondary != null && (
          <span className="truncate text-xs text-muted-foreground">{secondary}</span>
        )}
      </div>
    </div>
  )
}

/**
 * Renders one cell in a grouping-enabled DataTable, branching on what the cell
 * actually is. The final branch delegates to the column's own `cell` renderer,
 * so an editable leaf cell still renders defineColumns' edit-capable cell.
 * Only mounted when `grouping` is configured — flat tables never reach here.
 */
export function GroupAwareCell<TData>({
  cell,
  groupColumn,
}: GroupAwareCellProps<TData>) {
  const { row, column } = cell
  const isGroupColumn = column.id === GROUP_COLUMN_ID
  const indentSize = groupColumn.indentSize ?? 24

  // Structural row-gutter column (row number / selection checkbox): never a
  // real data cell, so it must be handled BEFORE the `getIsAggregated()`
  // branch below. TanStack's ColumnGrouping feature reports
  // `cell.getIsAggregated()` as true for EVERY column of a group row
  // (`!isGrouped && !isPlaceholder && row.subRows.length > 0`), including
  // this one, and always merges a default `aggregatedCell`
  // (`props => props.getValue()?.toString?.() ?? null`) onto every column
  // def — so falling into that branch here would call the default against a
  // column with no accessor (`getValue()` is undefined), rendering null and
  // leaving group rows with no checkbox at all. Delegate straight to the
  // gutter's own `cell` renderer instead, exactly like a normal leaf cell —
  // RowGutterCell itself already branches on `row.getIsGrouped()` to render
  // the tri-state group checkbox instead of a row number.
  if (column.id === ROW_GUTTER_COLUMN_ID) {
    return flexRender(cell.column.columnDef.cell, cell.getContext())
  }

  // Group row, group column: chevron + grouping value + (count).
  // Use row.getIsGrouped() (not cell.getIsGrouped()) because TanStack marks the
  // *grouping dimension* cell as grouped, never the synthesised __group__ cell.
  if (row.getIsGrouped() && isGroupColumn) {
    const count = getGroupRowCount(row, groupColumn.countMode)
    const canExpand = row.getCanExpand()
    return (
      // py-3/pr-2 match defineColumns' editable-cell padding (define-columns.tsx)
      // so the group column reads as one row height with the rest of the
      // table, not the cramped, flush-to-the-edge look of no padding at all.
      // The base 8px left inset (matching that same px-2) is folded into the
      // dynamic indent rather than left to a class, since indentation must
      // fully own padding-left; min-w-0 + truncate on the label is what turns
      // "content too wide for a narrow/deeply-indented cell" into a clean
      // ellipsis instead of a hard, invisible clip (the cell's own
      // overflow-hidden has no text-overflow of its own).
      <div
        className="flex min-w-0 items-center gap-1 py-3 pr-2"
        style={{ paddingLeft: 8 + row.depth * indentSize }}
      >
        {canExpand ? (
          <button
            type="button"
            aria-label={row.getIsExpanded() ? "Collapse group" : "Expand group"}
            onClick={() => row.getToggleExpandedHandler()()}
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted",
            )}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0 truncate font-semibold">
          {String(row.groupingValue ?? "")}
        </span>
        <span className="shrink-0 text-muted-foreground">({count})</span>
      </div>
    )
  }

  // Leaf row, group column: developer-supplied leaf content, indented.
  if (isGroupColumn) {
    return (
      <div
        className="min-w-0 py-3 pr-2"
        style={{ paddingLeft: 8 + (row.depth + 1) * indentSize }}
      >
        {renderLeafContent(row, groupColumn)}
      </div>
    )
  }

  // Aggregated cell (group row, non-group column). `columnDef.aggregatedCell`
  // is NEVER undefined here: TanStack's ColumnGrouping feature merges a
  // default (`props => props.getValue()?.toString?.() ?? null`) onto every
  // column def via `createColumn`, so the previous `?? cell.column.columnDef.cell`
  // fallback here was dead code — it could never run. Deliberately
  // NOT falling back to the leaf `cell` renderer even if it somehow could: a
  // group row's value is a synthesized rollup, and the leaf `cell` (e.g. an
  // edit-capable field renderer) is only correct against a real per-row
  // value. A consumer-supplied `aggregatedCell` (e.g. the CRM demo's
  // subtotal renderer) always wins here; a column that never set one still
  // renders correctly via TanStack's own default above.
  if (cell.getIsAggregated()) {
    return flexRender(cell.column.columnDef.aggregatedCell, cell.getContext())
  }

  // Placeholder (group row spanning a non-group column with no aggregation).
  if (cell.getIsPlaceholder()) return null

  // Normal leaf value — defineColumns' editable cell when the table is editable.
  return flexRender(cell.column.columnDef.cell, cell.getContext())
}
