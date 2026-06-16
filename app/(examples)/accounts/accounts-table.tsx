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

// Hoisted to module scope so the config keeps a stable reference across renders.
// Declarative leaf: a primary label with an optional icon and optional secondary
// line — drop `icon`/`secondary` when your data doesn't have them.
const groupColumn: GroupColumnConfig<Account> = {
  header: "Account",
  countMode: "leaf",
  leaf: {
    icon: () => <Landmark className="size-4 shrink-0 text-muted-foreground" />,
    primary: (row) => row.original.accountName,
    secondary: (row) => row.original.iban,
  },
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
