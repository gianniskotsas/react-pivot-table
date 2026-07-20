"use client"

import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { flexRender, type Cell, type Row } from "@tanstack/react-table"

import { cn } from "@/lib/utils"

import { getGroupRowCount } from "./grouping-utils"
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
    <div className="flex items-center gap-2">
      {icon}
      <div className="flex flex-col">
        <span className="font-medium">{leaf.primary(row)}</span>
        {secondary != null && (
          <span className="text-xs text-muted-foreground">{secondary}</span>
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

  // Group row, group column: chevron + grouping value + (count).
  // Use row.getIsGrouped() (not cell.getIsGrouped()) because TanStack marks the
  // *grouping dimension* cell as grouped, never the synthesised __group__ cell.
  if (row.getIsGrouped() && isGroupColumn) {
    const count = getGroupRowCount(row, groupColumn.countMode)
    const canExpand = row.getCanExpand()
    return (
      <div
        className="flex items-center gap-1"
        style={{ paddingLeft: row.depth * indentSize }}
      >
        {canExpand ? (
          <button
            type="button"
            aria-label={row.getIsExpanded() ? "Collapse group" : "Expand group"}
            onClick={() => row.getToggleExpandedHandler()()}
            className={cn(
              "flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted",
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
        <span className="font-semibold">{String(row.groupingValue ?? "")}</span>
        <span className="text-muted-foreground">({count})</span>
      </div>
    )
  }

  // Leaf row, group column: developer-supplied leaf content, indented.
  if (isGroupColumn) {
    return (
      <div style={{ paddingLeft: (row.depth + 1) * indentSize }}>
        {renderLeafContent(row, groupColumn)}
      </div>
    )
  }

  // Aggregated cell (group row, non-group column).
  if (cell.getIsAggregated()) {
    return flexRender(
      cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
      cell.getContext(),
    )
  }

  // Placeholder (group row spanning a non-group column with no aggregation).
  if (cell.getIsPlaceholder()) return null

  // Normal leaf value — defineColumns' editable cell when the table is editable.
  return flexRender(cell.column.columnDef.cell, cell.getContext())
}
