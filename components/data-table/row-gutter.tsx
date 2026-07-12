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
  const runtime = useDataTableRuntime()
  const selected = row.getIsSelected()
  // `pagination` is an unconditional built-in TanStack feature — the state
  // key always exists (default `{pageIndex: 0, pageSize: 10}`) even when
  // `enablePagination` is false, so this is never undefined in practice.
  const { pageIndex, pageSize } = table.getState().pagination
  // `row.index` is NOT this row's position in the currently-displayed order
  // — it's fixed at row creation to the row's index in its parent array
  // (i.e. the original, unsorted `data`), and getSortedRowModel preserves it
  // via a shallow copy (`{...row}`) rather than reassigning it. Sorting a
  // column then leaves `row.index` scrambled relative to what's on screen.
  // The row's real display position is its index within the current row
  // model instead — looked up by id, not by reference: the `row` this cell
  // receives via CellContext and the entries in `table.getRowModel().rows`
  // are logically the same row but NOT the same object (getSortedRowModel
  // rebuilds a fresh `{...row}` copy per row on each recomputation), so
  // `indexOf(row)` always misses and silently returns -1.
  const displayIndex = table.getRowModel().rows.findIndex((r) => r.id === row.id)
  const rowNumber = pageIndex * pageSize + displayIndex + 1

  // Both the number and the checkbox are always mounted; only their CSS
  // visibility toggles. An earlier version tracked hover via onMouseEnter/
  // onMouseLeave React state, but the shared Checkbox primitive gives itself
  // an oversized invisible touch target (`after:-inset-x-3 after:-inset-y-2`
  // in components/ui/checkbox.tsx) for accessibility — that hit region
  // spills a few pixels past this cell's own bounds into the row above/
  // below, so the pointer can cross into a neighboring row's territory
  // without ever firing this row's mouseleave, leaving its checkbox stuck
  // visible. Driving visibility from real-time `:hover`/`:focus-within`
  // instead of discrete enter/leave events sidesteps that entirely — CSS
  // pseudo-classes re-evaluate continuously from actual cursor/focus
  // position, so there's nothing to get "stuck". `[tr:hover_&]` (already
  // used the same way for pinned-column highlighting in data-table.tsx)
  // reveals on hovering anywhere in the row, not just this narrow cell,
  // matching the row's own native hover background. `group`/
  // `group-focus-within` keep it keyboard-reachable: tabbing onto this
  // cell's div reveals the checkbox so a second Tab can land on it.
  const numberHiddenClass = selected ? "hidden" : "[tr:hover_&]:hidden group-focus-within:hidden"
  const checkboxWrapperClass = selected
    ? "inline-flex"
    : "hidden [tr:hover_&]:inline-flex group-focus-within:inline-flex"

  return (
    <div
      className="group flex h-full items-center justify-center px-2 py-1 text-xs text-muted-foreground"
      tabIndex={0}
      aria-label={selected ? undefined : `Row ${rowNumber}`}
    >
      <span className={cn("tabular-nums", numberHiddenClass)}>{rowNumber}</span>
      <span className={checkboxWrapperClass}>
        <Checkbox
          checked={selected}
          onCheckedChange={(checked, eventDetails) => {
            const shiftKey =
              eventDetails.event instanceof MouseEvent && eventDetails.event.shiftKey
            runtime?.toggleRowSelected(row.id, checked === true, shiftKey)
          }}
          aria-label={selected ? `Deselect row ${rowNumber}` : `Select row ${rowNumber}`}
        />
      </span>
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
