"use client"

import type { Table } from "@tanstack/react-table"
import { ArrowLeftToLine, ArrowRightToLine, Columns3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent } from "@/components/ui/popover"

import { PopoverButtonTrigger } from "./primitives"
import type { DataTableColumnMeta } from "./types"

export function ColumnsMenuContent<TData>({ table }: { table: Table<TData> }) {
  const columns = table.getAllLeafColumns()

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
