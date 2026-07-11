"use client"

import type { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import type * as React from "react"

export function ColumnHeader<TData>({
  column,
  label,
  icon: Icon,
}: {
  column: Column<TData>
  label: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}) {
  const canSort = column.getCanSort()

  if (!canSort) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {Icon ? (
          <span aria-hidden="true">
            <Icon className="size-4" />
          </span>
        ) : null}
        {label}
      </span>
    )
  }

  const sorted = column.getIsSorted()
  const sortState =
    sorted === "asc" ? "sorted ascending" : sorted === "desc" ? "sorted descending" : "not sorted"
  const ariaLabel = typeof label === "string" ? `${label}, ${sortState}` : sortState

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      aria-label={ariaLabel}
      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
    >
      {Icon ? (
        <span aria-hidden="true">
          <Icon className="size-4" />
        </span>
      ) : null}
      {label}
      {sorted === "asc" ? (
        <ArrowUp data-sort="asc" className="size-4" aria-hidden="true" />
      ) : sorted === "desc" ? (
        <ArrowDown data-sort="desc" className="size-4" aria-hidden="true" />
      ) : (
        <ChevronsUpDown data-sort="none" className="size-4 opacity-40" aria-hidden="true" />
      )}
    </button>
  )
}
