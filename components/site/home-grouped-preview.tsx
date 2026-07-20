"use client"

import { Landmark } from "lucide-react"

import { DataTable } from "@/components/data-table"
import { columns } from "@/app/(examples)/accounts/columns"
import { accounts, type Account } from "@/app/(examples)/accounts/data"

const preview = accounts.slice(0, 9)

export function HomeGroupedPreview() {
  return (
    <DataTable<Account>
      data={preview}
      columns={columns}
      enablePagination={false}
      grouping={{
        dimensions: [{ id: "entity", label: "Entity" }],
        initial: ["entity"],
        column: {
          header: "Account",
          leaf: {
            icon: () => (
              <Landmark className="size-4 shrink-0 text-muted-foreground" />
            ),
            primary: (row) => row.original.accountName,
          },
        },
      }}
    />
  )
}
