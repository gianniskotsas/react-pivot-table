"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Archive, Pause } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  DataTable,
  defineColumns,
  type DataTableAction,
} from "@/components/data-table"

type Campaign = {
  id: string
  name: string
  channel: string
  status: string
  spend: number
  conversions: number
  roas: number
}

const CHANNELS = [
  { label: "Search", value: "search" },
  { label: "Social", value: "social" },
  { label: "Email", value: "email" },
  { label: "Display", value: "display" },
  { label: "Affiliate", value: "affiliate" },
]

const STATUSES = [
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Ended", value: "ended" },
]

const CAMPAIGNS: Campaign[] = [
  { id: "1", name: "Summer Sale — Search", channel: "search", status: "active", spend: 4200, conversions: 186, roas: 3.4 },
  { id: "2", name: "Retarget — Cart Abandoners", channel: "display", status: "active", spend: 1150, conversions: 64, roas: 4.1 },
  { id: "3", name: "Q3 Newsletter Push", channel: "email", status: "ended", spend: 320, conversions: 41, roas: 5.8 },
  { id: "4", name: "Instagram — New Arrivals", channel: "social", status: "active", spend: 2680, conversions: 97, roas: 1.6 },
  { id: "5", name: "Affiliate — Creator Program", channel: "affiliate", status: "paused", spend: 3900, conversions: 52, roas: 0.7 },
  { id: "6", name: "Brand Search — Defense", channel: "search", status: "active", spend: 980, conversions: 74, roas: 6.2 },
  { id: "7", name: "TikTok — Launch Teaser", channel: "social", status: "paused", spend: 2100, conversions: 28, roas: 0.5 },
  { id: "8", name: "Display — Competitor Conquest", channel: "display", status: "ended", spend: 1540, conversions: 19, roas: 0.9 },
]

const spendFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

// ROAS is a raw ColumnDef (rather than col.number(...)) so its cell can color
// by profitability threshold — the same "escape hatch" motif Financials uses
// for sign-colored amounts.
const roasColumn: ColumnDef<Campaign, unknown> = {
  id: "roas",
  accessorKey: "roas",
  header: () => <div className="text-right">ROAS</div>,
  meta: { label: "ROAS" },
  cell: ({ getValue }) => {
    const value = Number(getValue() ?? 0)
    return (
      <div
        className={cn(
          "px-3 py-2 text-right font-mono text-sm tabular-nums",
          value >= 1
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        )}
      >
        {value.toFixed(1)}x
      </div>
    )
  },
}

const col = defineColumns<Campaign>()
const columns: ColumnDef<Campaign, unknown>[] = [
  col.text("name", { header: "Campaign" }),
  col.singleSelect("channel", { header: "Channel", options: CHANNELS }),
  col.singleSelect("status", { header: "Status", options: STATUSES }),
  col.currency("spend", { header: "Spend" }),
  col.number("conversions", { header: "Conversions" }),
  roasColumn,
]

const actions: DataTableAction<Campaign>[] = [
  {
    id: "pause",
    label: "Pause",
    icon: Pause,
    onClick: ({ rows }) =>
      toast(`Paused ${rows.length} campaign${rows.length === 1 ? "" : "s"}`),
  },
  {
    id: "archive",
    label: "Archive",
    icon: Archive,
    variant: "destructive",
    onClick: ({ rows }) =>
      toast(`Archived ${rows.length} campaign${rows.length === 1 ? "" : "s"}`),
  },
]

function StatCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  )
}

export function MarketingCampaignsBlock() {
  const [data, setData] = React.useState(CAMPAIGNS)

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

  const { totalSpend, totalConversions, blendedRoas } = React.useMemo(() => {
    const totalSpend = data.reduce((sum, c) => sum + c.spend, 0)
    const totalConversions = data.reduce((sum, c) => sum + c.conversions, 0)
    const totalRevenue = data.reduce((sum, c) => sum + c.spend * c.roas, 0)
    return {
      totalSpend,
      totalConversions,
      blendedRoas: totalSpend === 0 ? 0 : totalRevenue / totalSpend,
    }
  }, [data])

  return (
    <div className="w-full space-y-4 rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div>
        <h3 className="font-semibold">Campaign Performance</h3>
        <p className="text-sm text-muted-foreground">
          Last 30 days, across every active channel.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Spend" value={spendFormatter.format(totalSpend)} />
        <StatCard label="Conversions" value={totalConversions.toLocaleString()} />
        <StatCard label="Blended ROAS" value={`${blendedRoas.toFixed(1)}x`} />
      </div>

      <DataTable<Campaign>
        data={data}
        columns={columns}
        getRowId={(row) => row.id}
        editable
        onUpdateData={handleUpdateData}
        enableRowSelection
        enablePagination={false}
        actions={actions}
        filterableColumns={[
          { id: "channel", label: "Channel", type: "select", options: CHANNELS },
          { id: "status", label: "Status", type: "select", options: STATUSES },
        ]}
        calculableColumns={[
          { columnId: "spend", default: "sum" },
          { columnId: "conversions", default: "sum" },
        ]}
      />
    </div>
  )
}
