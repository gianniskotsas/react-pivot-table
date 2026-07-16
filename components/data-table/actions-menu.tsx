"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"
import { ChevronDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { useDataTableRuntime } from "./data-table-runtime-context"
import { PopoverButtonTrigger } from "./primitives"
import type { DataTableAction } from "./types"

export function ActionsMenuContent<TData>({
  actions,
  rowIds,
  rows,
  allMatching,
  onActionClick,
}: {
  actions: DataTableAction<TData>[]
  rowIds: string[]
  rows: TData[]
  allMatching: boolean
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
              action.onClick({ rowIds, rows, allMatching })
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
  const runtime = useDataTableRuntime()
  const selectedRows = table.getSelectedRowModel().rows
  const rowIds = React.useMemo(() => selectedRows.map((r) => r.id), [selectedRows])
  const rows = React.useMemo(() => selectedRows.map((r) => r.original), [selectedRows])

  // Under manual pagination, the select-all cycle can advance to a logical
  // "every matching row" selection that exceeds what's loaded client-side.
  // getSelectedRowModel() only ever contains loaded rows, so without this the
  // badge would claim (say) 50 while the header checkbox claims "all 10,000
  // matching" — and the action itself couldn't tell the two scopes apart.
  const allMatching = runtime?.isAllMatchingSelected ?? false
  const badgeCount =
    allMatching && runtime?.totalRowCount !== undefined
      ? Math.max(runtime.totalRowCount, rowIds.length)
      : rowIds.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverButtonTrigger className="gap-2" disabled={rowIds.length === 0 && !allMatching}>
        Actions
        {badgeCount > 0 && <Badge variant="secondary">{badgeCount}</Badge>}
        <ChevronDown className="size-4" aria-hidden="true" />
      </PopoverButtonTrigger>
      <PopoverContent align="start" className="w-56">
        <ActionsMenuContent
          actions={actions}
          rowIds={rowIds}
          rows={rows}
          allMatching={allMatching}
          onActionClick={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}
