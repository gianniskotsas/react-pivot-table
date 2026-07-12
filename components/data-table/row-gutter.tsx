"use client"

import type { CellContext, ColumnDef, HeaderContext } from "@tanstack/react-table"
import { Minus } from "lucide-react"
import * as React from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

import { useDataTableRuntime } from "./data-table-runtime-context"

/** Stable id for the injected leading gutter column (row numbers + selection). */
export const ROW_GUTTER_COLUMN_ID = "__row-gutter__"

function SelectAllHeader<TData>({ table }: HeaderContext<TData, unknown>) {
  const runtime = useDataTableRuntime()
  const isAllMatchingSelected = runtime?.isAllMatchingSelected ?? false
  const hasMoreThanLoaded =
    (runtime?.manualPagination ?? false) &&
    (runtime?.totalRowCount ?? 0) > table.getFilteredRowModel().flatRows.length

  const allPageSelected = table.getIsAllPageRowsSelected()
  const allLoadedSelected = table.getIsAllRowsSelected()
  const someSelected = table.getIsSomeRowsSelected() || table.getIsSomePageRowsSelected()

  const checked = isAllMatchingSelected || allLoadedSelected
  const indeterminate = !checked && someSelected

  const ariaLabel = isAllMatchingSelected
    ? "All matching rows selected — deselect"
    : allLoadedSelected
      ? hasMoreThanLoaded
        ? "All loaded rows selected — deselect, or select all matching rows"
        : "Deselect all rows"
      : someSelected
        ? "Some rows selected — select all"
        : "Select all rows"

  function handleClick() {
    if (isAllMatchingSelected) {
      runtime?.setAllMatchingSelected(false)
      table.toggleAllRowsSelected(false)
      return
    }
    if (allLoadedSelected) {
      if (hasMoreThanLoaded) runtime?.setAllMatchingSelected(true)
      else table.toggleAllRowsSelected(false)
      return
    }
    if (allPageSelected) {
      table.toggleAllRowsSelected(true)
      return
    }
    table.toggleAllPageRowsSelected(true)
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <Checkbox
        checked={checked}
        indeterminate={indeterminate}
        onCheckedChange={handleClick}
        aria-label={ariaLabel}
        className={indeterminate ? "[&_svg]:opacity-0" : undefined}
      />
      {indeterminate ? (
        <Minus className="pointer-events-none absolute size-3" aria-hidden="true" />
      ) : null}
    </div>
  )
}

function RowGutterCell<TData>({ row, table }: CellContext<TData, unknown>) {
  const [hovered, setHovered] = React.useState(false)
  const selected = row.getIsSelected()
  // `pagination` is an unconditional built-in TanStack feature — the state
  // key always exists (default `{pageIndex: 0, pageSize: 10}`) even when
  // `enablePagination` is false, so this is never undefined in practice.
  const { pageIndex, pageSize } = table.getState().pagination
  const rowNumber = pageIndex * pageSize + row.index + 1
  const showCheckbox = selected || hovered

  return (
    <div
      className="flex h-full items-center justify-center px-2 py-1 text-xs text-muted-foreground"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label={showCheckbox ? undefined : `Row ${rowNumber}`}
    >
      {showCheckbox ? (
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => row.toggleSelected(checked === true)}
          aria-label={selected ? `Deselect row ${rowNumber}` : `Select row ${rowNumber}`}
        />
      ) : (
        <span className={cn("tabular-nums")}>{rowNumber}</span>
      )}
    </div>
  )
}

/**
 * Builds the leading gutter column: row numbers that swap to a selection
 * checkbox on hover (or when the row is selected), plus a tri-state
 * select-all checkbox in the header. Prepended to the user's columns by
 * useDataTable (Task 3) when `enableRowSelection` is true — not part of the
 * `defineColumns` builder, since it's a structural, table-owned column with
 * no TData accessor.
 */
export function buildRowGutterColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: ROW_GUTTER_COLUMN_ID,
    header: SelectAllHeader,
    cell: RowGutterCell,
    enableSorting: false,
    enableHiding: false,
    enablePinning: false,
    enableResizing: false,
    size: 40,
  }
}
