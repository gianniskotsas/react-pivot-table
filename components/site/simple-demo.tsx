"use client"

import { DataTable } from "@/components/data-table"
import { DimensionPicker } from "@/components/dimension-picker"
import { columns } from "@/app/(examples)/accounts/columns"
import { accounts, type Account } from "@/app/(examples)/accounts/data"

/**
 * Minimal config: group by a single dimension, a name-only leaf (no icon or
 * secondary line), and no filters.
 */
export function SimpleDemo() {
  return (
    <DataTable<Account>
      data={accounts}
      columns={columns}
      grouping={{
        dimensions: [
          { id: "entity", label: "Entity" },
          { id: "bank", label: "Bank" },
        ],
        initial: ["entity"],
        column: {
          header: "Account",
          leaf: { primary: (row) => row.original.accountName },
        },
        renderControl: ({ dimensions, grouping, setGrouping }) => (
          <DimensionPicker
            dimensions={dimensions}
            grouping={grouping}
            onGroupingChange={setGrouping}
          />
        ),
      }}
    />
  )
}
