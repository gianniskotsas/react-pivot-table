"use client"

import { Landmark } from "lucide-react"

import { GroupedDataTable } from "@/components/grouped-data-table"

import { columns } from "./columns"
import type { Account } from "./data"

export function AccountsTable({ data }: { data: Account[] }) {
  return (
    <GroupedDataTable<Account>
      data={data}
      columns={columns}
      groupableDimensions={[
        { id: "entity", label: "Entity" },
        { id: "bank", label: "Bank" },
      ]}
      initialGrouping={["entity", "bank"]}
      groupColumn={{
        header: "Account",
        countMode: "leaf",
        renderLeaf: (row) => {
          const account = row.original as Account
          return (
            <div className="flex items-center gap-2">
              <Landmark className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium underline-offset-2 hover:underline">
                  {account.accountName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {account.iban}
                </span>
              </div>
            </div>
          )
        },
      }}
    />
  )
}
