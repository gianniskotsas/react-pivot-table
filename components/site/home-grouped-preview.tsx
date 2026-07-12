"use client"

import { Landmark } from "lucide-react"

import { GroupedDataTable } from "@/components/grouped-data-table"
import { columns } from "@/app/(examples)/accounts/columns"
import { accounts, type Account } from "@/app/(examples)/accounts/data"

const preview = accounts.slice(0, 9)

export function HomeGroupedPreview() {
  return (
    <GroupedDataTable<Account>
      data={preview}
      columns={columns}
      groupableDimensions={[{ id: "entity", label: "Entity" }]}
      initialGrouping={["entity"]}
      groupColumn={{
        header: "Account",
        leaf: {
          icon: () => (
            <Landmark className="size-4 shrink-0 text-muted-foreground" />
          ),
          primary: (row) => row.original.accountName,
        },
      }}
      enablePagination={false}
    />
  )
}
