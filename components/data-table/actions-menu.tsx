"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"
import { ChevronDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { PopoverButtonTrigger } from "./primitives"
import type { DataTableAction } from "./types"

export function ActionsMenuContent<TData>({
  actions,
  rowIds,
  rows,
  onActionClick,
}: {
  actions: DataTableAction<TData>[]
  rowIds: string[]
  rows: TData[]
  onActionClick: () => void
}) {
  return (
    <div className="space-y-0.5">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
              action.variant === "destructive" && "text-destructive hover:bg-destructive/10",
            )}
            onClick={() => {
              action.onClick({ rowIds, rows })
              onActionClick()
            }}
          >
            {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
            {action.label}
          </button>
        )
      })}
    </div>
  )
}

export function ActionsMenu<TData>({
  table,
  actions,
}: {
  table: Table<TData>
  actions: DataTableAction<TData>[]
}) {
  // Controlled (unlike ColumnsMenu's checkboxes, which stay open for
  // multi-toggle) so a one-shot action click can close the popover.
  const [open, setOpen] = React.useState(false)
  const selectedRows = table.getSelectedRowModel().rows
  const rowIds = React.useMemo(() => selectedRows.map((r) => r.id), [selectedRows])
  const rows = React.useMemo(() => selectedRows.map((r) => r.original), [selectedRows])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverButtonTrigger className="gap-2">
        Actions
        {rowIds.length > 0 && <Badge variant="secondary">{rowIds.length}</Badge>}
        <ChevronDown className="size-4" aria-hidden="true" />
      </PopoverButtonTrigger>
      <PopoverContent align="start" className="w-56">
        <ActionsMenuContent
          actions={actions}
          rowIds={rowIds}
          rows={rows}
          onActionClick={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}
