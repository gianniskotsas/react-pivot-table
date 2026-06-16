"use client"

import type { ColumnDef } from "@tanstack/react-table"

import type { Account } from "./data"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const columns: ColumnDef<Account, unknown>[] = [
  {
    id: "entity",
    accessorKey: "entity",
    header: "Entity",
    enableGrouping: true,
  },
  {
    id: "bank",
    accessorKey: "bank",
    header: "Bank",
    enableGrouping: true,
  },
  {
    id: "currency",
    accessorKey: "currency",
    header: "Ccy",
    enableGrouping: false,
  },
  {
    id: "balance",
    accessorKey: "balance",
    header: () => <div className="text-right">Balance</div>,
    enableGrouping: false,
    aggregationFn: "sum",
    cell: ({ getValue }) => (
      <div className="text-right tabular-nums">
        {currencyFormatter.format(Number(getValue() ?? 0))}
      </div>
    ),
    aggregatedCell: ({ getValue }) => (
      <div className="text-right font-medium tabular-nums">
        {currencyFormatter.format(Number(getValue() ?? 0))}
      </div>
    ),
  },
]
