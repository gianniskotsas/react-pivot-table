"use client"

import { GroupedDataTable } from "@/components/grouped-data-table"
import { columns } from "@/app/(examples)/accounts/columns"
import { accounts, type Account } from "@/app/(examples)/accounts/data"

/**
 * Minimal config: group by a single dimension, a name-only leaf (no icon or
 * secondary line), and no filters.
 */
export function SimpleDemo() {
  return (
    <GroupedDataTable<Account>
      data={accounts}
      columns={columns}
      groupableDimensions={[
        { id: "entity", label: "Entity" },
        { id: "bank", label: "Bank" },
      ]}
      initialGrouping={["entity"]}
      groupColumn={{
        header: "Account",
        leaf: { primary: (row) => row.original.accountName },
      }}
    />
  )
}
