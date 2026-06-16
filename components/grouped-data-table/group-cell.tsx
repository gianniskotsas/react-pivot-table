"use client"

import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { flexRender, type Cell } from "@tanstack/react-table"

import { cn } from "@/lib/utils"

import { getGroupRowCount } from "./grouping-utils"
import { GROUP_COLUMN_ID, type GroupColumnConfig } from "./types"

type GroupCellProps<TData> = {
  cell: Cell<TData, unknown>
  groupColumn: GroupColumnConfig<TData>
}

export function GroupCell<TData>({ cell, groupColumn }: GroupCellProps<TData>) {
  const { row, column } = cell
  const isGroupColumn = column.id === GROUP_COLUMN_ID
  const indentSize = groupColumn.indentSize ?? 24

  // Group row, group column: chevron + grouping value + (count).
  if (cell.getIsGrouped() && isGroupColumn) {
    const count = getGroupRowCount(row, groupColumn.countMode)
    const canExpand = row.getCanExpand()
    return (
      <div
        className="flex items-center gap-1"
        style={{ paddingLeft: row.depth * indentSize }}
      >
        <button
          type="button"
          aria-label={row.getIsExpanded() ? "Collapse group" : "Expand group"}
          onClick={row.getToggleExpandedHandler()}
          disabled={!canExpand}
          className={cn(
            "flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted",
            !canExpand && "invisible",
          )}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
        <span className="font-semibold">
          {String(cell.getValue() ?? "")}
        </span>
        <span className="text-muted-foreground">({count})</span>
      </div>
    )
  }

  // Leaf row, group column: developer-supplied leaf renderer, indented.
  if (isGroupColumn) {
    return (
      <div style={{ paddingLeft: (row.depth + 1) * indentSize }}>
        {groupColumn.renderLeaf(row)}
      </div>
    )
  }

  // Aggregated cell (group row, non-group column).
  if (cell.getIsAggregated()) {
    return (
      <>
        {flexRender(
          cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
          cell.getContext(),
        )}
      </>
    )
  }

  // Placeholder cell (group row spanning a non-group column with no aggregation).
  if (cell.getIsPlaceholder()) {
    return null
  }

  // Normal leaf value.
  return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>
}
