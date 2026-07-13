"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { CheckCircle2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  DataTable,
  defineColumns,
  type DataTableAction,
} from "@/components/data-table"

type Transaction = {
  id: string
  date: string
  description: string
  category: string
  account: string
  amount: number
  status: string
}

const CATEGORIES = [
  { label: "Income", value: "income" },
  { label: "Housing", value: "housing" },
  { label: "Food", value: "food" },
  { label: "Transport", value: "transport" },
  { label: "Software", value: "software" },
  { label: "Utilities", value: "utilities" },
]

const ACCOUNTS = [
  { label: "Checking", value: "checking" },
  { label: "Savings", value: "savings" },
  { label: "Credit Card", value: "credit-card" },
]

const STATUSES = [
  { label: "Cleared", value: "cleared" },
  { label: "Pending", value: "pending" },
]

const TRANSACTIONS: Transaction[] = [
  { id: "1", date: "2026-07-01", description: "Client payment — Acme Robotics", category: "income", account: "checking", amount: 8200, status: "cleared" },
  { id: "2", date: "2026-07-02", description: "Office rent", category: "housing", account: "checking", amount: -2400, status: "cleared" },
  { id: "3", date: "2026-07-03", description: "AWS", category: "software", account: "credit-card", amount: -412.5, status: "cleared" },
  { id: "4", date: "2026-07-04", description: "Team lunch", category: "food", account: "credit-card", amount: -86.4, status: "pending" },
  { id: "5", date: "2026-07-05", description: "Client payment — Globex Trading", category: "income", account: "checking", amount: 5400, status: "pending" },
  { id: "6", date: "2026-07-06", description: "Electricity", category: "utilities", account: "checking", amount: -164.2, status: "cleared" },
  { id: "7", date: "2026-07-08", description: "Ride share", category: "transport", account: "credit-card", amount: -38.9, status: "cleared" },
  { id: "8", date: "2026-07-09", description: "Figma subscription", category: "software", account: "credit-card", amount: -45, status: "cleared" },
  { id: "9", date: "2026-07-10", description: "Transfer to savings", category: "housing", account: "savings", amount: -3000, status: "cleared" },
  { id: "10", date: "2026-07-11", description: "Client payment — Initech", category: "income", account: "checking", amount: 6100, status: "pending" },
]

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  signDisplay: "always",
})

const totalFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

// Amount is a raw ColumnDef (the same "escape hatch" any plain TanStack
// ColumnDef gives you) rather than col.currency(...), so its cell can color
// by sign — a look Field Types' currency formatter doesn't offer out of the
// box. It won't be inline-editable like the col.*-built columns below.
const amountColumn: ColumnDef<Transaction, unknown> = {
  id: "amount",
  accessorKey: "amount",
  header: () => <div className="text-right">Amount</div>,
  meta: { label: "Amount" },
  cell: ({ getValue }) => {
    const value = Number(getValue() ?? 0)
    return (
      <div
        className={cn(
          "px-3 py-2 text-right font-mono text-sm tabular-nums",
          value >= 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-foreground"
        )}
      >
        {currencyFormatter.format(value)}
      </div>
    )
  },
}

const col = defineColumns<Transaction>()
const columns: ColumnDef<Transaction, unknown>[] = [
  col.date("date", { header: "Date" }),
  col.text("description", { header: "Description" }),
  col.singleSelect("category", { header: "Category", options: CATEGORIES }),
  col.singleSelect("account", { header: "Account", options: ACCOUNTS }),
  amountColumn,
  col.singleSelect("status", { header: "Status", options: STATUSES }),
]

const actions: DataTableAction<Transaction>[] = [
  {
    id: "clear",
    label: "Mark cleared",
    icon: CheckCircle2,
    onClick: ({ rows }) =>
      toast(`Marked ${rows.length} transaction${rows.length === 1 ? "" : "s"} cleared`),
  },
  {
    id: "delete",
    label: "Delete",
    icon: Trash2,
    variant: "destructive",
    onClick: ({ rows }) =>
      toast(`Deleted ${rows.length} transaction${rows.length === 1 ? "" : "s"}`),
  },
]

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "positive" | "negative"
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-xl font-semibold tabular-nums",
          tone === "positive"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        )}
      >
        {totalFormatter.format(value)}
      </p>
    </div>
  )
}

export function FinancialsBlock() {
  const [data, setData] = React.useState(TRANSACTIONS)

  const handleUpdateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setData((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, [columnId]: value } : row
        )
      )
    },
    []
  )

  const { income, expenses, net } = React.useMemo(() => {
    let income = 0
    let expenses = 0
    for (const t of data) {
      if (t.amount >= 0) income += t.amount
      else expenses += t.amount
    }
    return { income, expenses, net: income + expenses }
  }, [data])

  return (
    <div className="w-full space-y-4 rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div>
        <h3 className="font-semibold">Recent Transactions</h3>
        <p className="text-sm text-muted-foreground">
          Checking, Savings, and Credit Card — last 30 days.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Income" value={income} tone="positive" />
        <StatCard label="Expenses" value={expenses} tone="negative" />
        <StatCard label="Net" value={net} tone={net >= 0 ? "positive" : "negative"} />
      </div>

      <DataTable<Transaction>
        data={data}
        columns={columns}
        getRowId={(row) => row.id}
        editable
        onUpdateData={handleUpdateData}
        enableRowSelection
        enablePagination={false}
        actions={actions}
        filterableColumns={[
          { id: "category", label: "Category", type: "select", options: CATEGORIES },
          { id: "account", label: "Account", type: "select", options: ACCOUNTS },
          { id: "status", label: "Status", type: "select", options: STATUSES },
        ]}
        calculableColumns={[{ columnId: "amount", default: "sum" }]}
      />
    </div>
  )
}
