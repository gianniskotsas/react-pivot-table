"use client"

import { Landmark } from "lucide-react"

import { GroupedDataTable } from "@/components/grouped-data-table"
import type { GroupColumnConfig, DimensionDef, FilterDef } from "@/components/grouped-data-table"

import { columns } from "./columns"
import { accounts } from "./data"
import type { Account } from "./data"

const groupableDimensions: DimensionDef[] = [
  { id: "entity", label: "Entity" },
  { id: "bank", label: "Bank" },
]

const uniqueOptions = (values: string[]) =>
  Array.from(new Set(values)).map((v) => ({ label: v, value: v }))

const filterableColumns: FilterDef[] = [
  { id: "entity", label: "Entity", type: "select", options: uniqueOptions(accounts.map((a) => a.entity)) },
  { id: "bank", label: "Bank", type: "select", options: uniqueOptions(accounts.map((a) => a.bank)) },
  { id: "currency", label: "Ccy", type: "select", options: uniqueOptions(accounts.map((a) => a.currency)) },
  { id: "balance", label: "Balance", type: "number" },
]

// Hoisted to module scope so the config (and its renderLeaf) keeps a stable
// reference across renders, avoiding needless rebuilds of the table's columns.
const groupColumn: GroupColumnConfig<Account> = {
  header: "Account",
  countMode: "leaf",
  renderLeaf: (row) => (
    <div className="flex items-center gap-2">
      <Landmark className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="font-medium underline-offset-2 hover:underline">
          {row.original.accountName}
        </span>
        <span className="text-xs text-muted-foreground">{row.original.iban}</span>
      </div>
    </div>
  ),
}

export function AccountsTable({ data }: { data: Account[] }) {
  return (
    <GroupedDataTable<Account>
      data={data}
      columns={columns}
      groupableDimensions={groupableDimensions}
      initialGrouping={["entity", "bank"]}
      groupColumn={groupColumn}
      filterableColumns={filterableColumns}
    />
  )
}
