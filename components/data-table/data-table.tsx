"use client"

import { flexRender, type Column, type ColumnDef, type Table as ReactTable } from "@tanstack/react-table"
import { Download } from "lucide-react"
import type * as React from "react"
import { toast } from "sonner"

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

import { ActionsMenu } from "./actions-menu"
import { ColumnHeader } from "./column-header"
import { ColumnsMenu } from "./columns-menu"
import { DataTableRuntimeContext } from "./data-table-runtime-context"
import { downloadCsv, exportCsv } from "./export-csv"
import { FilterPopover } from "./filter-builder"
import { DataTableFooter } from "./footer-aggregation"
import { ROW_GUTTER_COLUMN_ID } from "./row-gutter"
import { useDataTable } from "./use-data-table"
import { useFooterAggregation } from "./use-footer-aggregation"
import type {
  CalculableColumn,
  ComputeAggregateArgs,
  DataTableAction,
  DataTableColumnMeta,
  FilterDef,
  FilterState,
} from "./types"

export type DataTableProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  getRowId?: (row: TData, index: number) => string
  editable?: boolean
  onUpdateData?: (rowId: string, columnId: string, value: unknown) => void
  onCreateRows?: (partialRows: Partial<TData>[]) => void
  enablePagination?: boolean
  enableRowSelection?: boolean
  manualPagination?: boolean
  totalRowCount?: number
  calculableColumns?: CalculableColumn[]
  computeAggregate?: (args: ComputeAggregateArgs) => Promise<number>
  /** Shows the toolbar's Export button. Default true. */
  enableExport?: boolean
  /** Declares which columns are filterable and how (the filter "options"). */
  filterableColumns?: FilterDef[]
  /** Initial filter state (groups + AND/OR). */
  initialFilterState?: FilterState
  /** Developer-configured bulk actions, shown in the Actions dropdown next to Columns. */
  actions?: DataTableAction<TData>[]
}

type PinnedCellStyle = { style: React.CSSProperties; className?: string }

// Pinned cells need their own background so they stay opaque over the
// scrolling columns behind them — but TableRow (components/ui/table.tsx)
// applies its hover/selected background as a CSS class on the <tr>, relying
// on <td>/<th> children being transparent so that background shows through.
// A plain inline `background` on the pinned cell would always beat the row's
// class (inline styles win over class-based pseudo-classes/variants), so on
// hover every column would highlight except the pinned ones. Instead, the
// background lives in `className` as arbitrary-variant ancestor selectors:
// `[tr:hover_&]`/`[tr[data-state=selected]_&]` target the pinned cell
// whenever it's a descendant of a hovered/selected <tr>, via a plain CSS
// descendant combinator — no `group` marker class required on TableRow.
// Deliberately NOT keyed off TableRow's `group` class (the earlier approach):
// `components/ui/table.tsx` is a `registryDependency: "table"` in this
// registry's items, so a fresh `npx shadcn add data-table` on a consumer
// project installs the stock, unmodified shadcn table.tsx with no `group`
// class — that would silently break pinned-column hover/selected
// highlighting for every real registry consumer even though it works in this
// repo. The ancestor-selector form has no such dependency. Sticky
// positioning, zIndex, and the box-shadow divider stay inline since they
// aren't state-dependent.
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
    className: "bg-background [tr:hover_&]:bg-muted/50 [tr[data-state=selected]_&]:bg-muted",
  }
}

// Exports the current sorted/filtered/visible view: visible leaf columns
// (minus the structural row-gutter column, which has no DataTableColumnMeta
// and nothing meaningful to export) run through the sorted row model, so the
// CSV matches what's on screen rather than the original unsorted `data`.
function ExportCsvButton<TData>({ table }: { table: ReactTable<TData> }) {
  function handleExport() {
    const columns = table
      .getVisibleLeafColumns()
      .filter((column) => column.id !== ROW_GUTTER_COLUMN_ID)
      .map((column) => {
        const meta = column.columnDef.meta as DataTableColumnMeta | undefined
        return {
          id: column.id,
          label: meta?.label ?? column.id,
          toClipboard: meta?.toClipboard ?? ((v: unknown) => String(v ?? "")),
        }
      })
    const rows = table.getSortedRowModel().rows.map((row) => {
      const values: Record<string, unknown> = {}
      for (const column of columns) values[column.id] = row.getValue(column.id)
      return values
    })
    const csv = exportCsv(rows, columns)
    downloadCsv("export.csv", csv)
    toast(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"} to CSV`)
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleExport} aria-label="Export">
      Export
      <Download className="size-4" aria-hidden="true" />
    </Button>
  )
}

export function DataTable<TData>(props: DataTableProps<TData>) {
  const { table, runtime, filterState, setFilterState } = useDataTable(props)
  const enablePagination = props.enablePagination ?? true
  const columnCount = table.getVisibleFlatColumns().length
  const aggregation = useFooterAggregation({
    table,
    calculableColumns: props.calculableColumns,
    computeAggregate: props.computeAggregate,
    manualPagination: props.manualPagination,
    totalRowCount: props.totalRowCount,
    isAllMatchingSelected: runtime.isAllMatchingSelected,
  })

  return (
    <DataTableRuntimeContext.Provider value={runtime}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ColumnsMenu table={table} />
            {props.filterableColumns && props.filterableColumns.length > 0 && (
              <FilterPopover
                filterableColumns={props.filterableColumns}
                filterState={filterState}
                onFilterStateChange={setFilterState}
              />
            )}
            {props.actions && props.actions.length > 0 && (
              <ActionsMenu table={table} actions={props.actions} />
            )}
          </div>
          {(props.enableExport ?? true) && <ExportCsvButton table={table} />}
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
                        className={cn("overflow-hidden text-ellipsis", pinned.className)}
                      >
                        {header.isPlaceholder ? null : meta ? (
                          <ColumnHeader column={header.column} label={meta.label} />
                        ) : (
                          // Structural columns (e.g. the row-gutter column)
                          // aren't built by defineColumns, so they carry no
                          // DataTableColumnMeta — flexRender their own
                          // columnDef.header instead of routing through
                          // ColumnHeader's label-only rendering, which would
                          // otherwise print the column id as plain text
                          // rather than invoking the column's header
                          // component (e.g. row-gutter's tri-state
                          // select-all checkbox).
                          flexRender(header.column.columnDef.header, header.getContext())
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
                  <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                    {row.getVisibleCells().map((cell) => {
                      const pinned = pinnedStyle(cell.column)
                      return (
                        <TableCell
                          key={cell.id}
                          style={{ width: cell.column.getSize(), ...pinned.style }}
                          className={cn("overflow-hidden p-0", pinned.className)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
            <DataTableFooter table={table} aggregation={aggregation} />
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
