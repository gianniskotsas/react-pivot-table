"use client"

import type { Table } from "@tanstack/react-table"
import { ArrowLeftToLine, ArrowRightToLine, Columns3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent } from "@/components/ui/popover"

import { PopoverButtonTrigger } from "./primitives"
import type { DataTableColumnMeta } from "./types"

export function ColumnsMenuContent<TData>({ table }: { table: Table<TData> }) {
  // Columns that can neither be hidden nor pinned (e.g. row-gutter.tsx's
  // structural selection/row-number column, which sets both to false) have
  // nothing for this menu to offer — every control below is conditional on
  // one of those two capabilities, so such a column would otherwise render
  // as a bare row showing its raw internal id with no controls at all.
  //
  // A column currently used as a grouping dimension is also omitted: useDataTable
  // forces such a column's visibility to hidden (its values show only in the
  // group column), spreading that derived visibility over whatever the user set
  // LAST — so a checkbox for it here would toggle local state that never takes
  // effect, a dead control that lies about what it does. `column.getIsGrouped()`
  // is a stock TanStack Column method that always exists (it's part of the
  // bundled feature set `@tanstack/react-table` registers for every table) and
  // reads `table.getState().grouping`, which is empty for every flat table — so
  // this is a no-op filter when grouping isn't configured at all.
  const columns = table
    .getAllLeafColumns()
    .filter((column) => (column.getCanHide() || column.getCanPin()) && !column.getIsGrouped())

  return (
    <div className="space-y-0.5">
      {columns.map((column) => {
        const label = (column.columnDef.meta as DataTableColumnMeta | undefined)?.label ?? column.id
        const pinned = column.getIsPinned()
        return (
          <div
            key={column.id}
            className="flex items-center justify-between gap-2 rounded-sm px-1 py-1 text-sm hover:bg-muted"
          >
            <label className="flex flex-1 cursor-pointer items-center gap-2 select-none">
              {column.getCanHide() ? (
                <Checkbox
                  checked={column.getIsVisible()}
                  onCheckedChange={(checked) => column.toggleVisibility(checked === true)}
                />
              ) : null}
              <span className="flex-1">{label}</span>
            </label>
            {column.getCanPin() ? (
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant={pinned === "left" ? "secondary" : "ghost"}
                  size="icon-xs"
                  aria-label={`Pin ${label} left`}
                  onClick={() => column.pin(pinned === "left" ? false : "left")}
                >
                  <ArrowLeftToLine className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant={pinned === "right" ? "secondary" : "ghost"}
                  size="icon-xs"
                  aria-label={`Pin ${label} right`}
                  onClick={() => column.pin(pinned === "right" ? false : "right")}
                >
                  <ArrowRightToLine className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function ColumnsMenu<TData>({ table }: { table: Table<TData> }) {
  return (
    <Popover>
      <PopoverButtonTrigger className="gap-2">
        <Columns3 className="size-4" aria-hidden="true" />
        Columns
      </PopoverButtonTrigger>
      <PopoverContent align="start" className="w-64">
        <ColumnsMenuContent table={table} />
      </PopoverContent>
    </Popover>
  )
}
