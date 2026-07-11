"use client"

import { flexRender, type Column, type ColumnDef } from "@tanstack/react-table"
import type * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { ColumnHeader } from "./column-header"
import { ColumnsMenu } from "./columns-menu"
import { DataTableRuntimeContext } from "./data-table-runtime-context"
import { useDataTable } from "./use-data-table"
import type { DataTableColumnMeta } from "./types"

export type DataTableProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  getRowId?: (row: TData, index: number) => string
  editable?: boolean
  onUpdateData?: (rowId: string, columnId: string, value: unknown) => void
  enablePagination?: boolean
}

type PinnedCellStyle = { style: React.CSSProperties; className?: string }

// Pinned cells need their own background so they stay opaque over the
// scrolling columns behind them — but TableRow (components/ui/table.tsx)
// applies its hover/selected background as a CSS class on the <tr>, relying
// on <td>/<th> children being transparent so that background shows through.
// A plain inline `background` on the pinned cell would always beat the row's
// class (inline styles win over class-based pseudo-classes/variants), so on
// hover every column would highlight except the pinned ones. Instead, the
// background lives in `className` as `group-*` variants keyed off TableRow's
// `group` class: base background normally, tracking the row's hover/selected
// background when the row is hovered/selected. Sticky positioning, zIndex,
// and the box-shadow divider stay inline since they aren't state-dependent.
function pinnedStyle<TData>(column: Column<TData, unknown>): PinnedCellStyle {
  const pinned = column.getIsPinned()
  if (!pinned) return { style: {} }
  return {
    style: {
      position: "sticky",
      left: pinned === "left" ? column.getStart("left") : undefined,
      right: pinned === "right" ? column.getAfter("right") : undefined,
      zIndex: 1,
      boxShadow:
        pinned === "left"
          ? "1px 0 0 0 var(--border) inset"
          : "-1px 0 0 0 var(--border) inset",
    },
    className: "bg-background group-hover:bg-muted/50 group-data-[state=selected]:bg-muted",
  }
}

export function DataTable<TData>(props: DataTableProps<TData>) {
  const { table, runtime } = useDataTable(props)
  const enablePagination = props.enablePagination ?? true
  const columnCount = table.getVisibleFlatColumns().length

  return (
    <DataTableRuntimeContext.Provider value={runtime}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ColumnsMenu table={table} />
        </div>

        <div className="rounded-md border" onKeyDown={runtime.handleKeyDown}>
          <Table style={{ tableLayout: "fixed" }}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined
                    const pinned = pinnedStyle(header.column)
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize(), ...pinned.style }}
                        className={pinned.className}
                      >
                        {header.isPlaceholder ? null : (
                          <ColumnHeader
                            column={header.column}
                            label={meta?.label ?? header.column.id}
                          />
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                    No results.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const pinned = pinnedStyle(cell.column)
                      return (
                        <TableCell
                          key={cell.id}
                          style={{ width: cell.column.getSize(), ...pinned.style }}
                          className={cn("p-0", pinned.className)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {enablePagination && (
          <nav aria-label="Table pagination" className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Previous page"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label="Next page"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </nav>
        )}
      </div>
    </DataTableRuntimeContext.Provider>
  )
}
