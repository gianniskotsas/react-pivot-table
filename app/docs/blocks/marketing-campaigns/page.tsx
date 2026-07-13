import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { MarketingCampaignsBlock } from "@/components/site/marketing-campaigns-block"

const CODE = `"use client"

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
  // ...more rows
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
          value >= 1 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
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
    onClick: ({ rows }) => toast(\`Paused \${rows.length} campaign\${rows.length === 1 ? "" : "s"}\`),
  },
  {
    id: "archive",
    label: "Archive",
    icon: Archive,
    variant: "destructive",
    onClick: ({ rows }) => toast(\`Archived \${rows.length} campaign\${rows.length === 1 ? "" : "s"}\`),
  },
]

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function MarketingCampaignsBlock() {
  const [data, setData] = React.useState(CAMPAIGNS)

  const handleUpdateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setData((prev) => prev.map((row) => (row.id === rowId ? { ...row, [columnId]: value } : row)))
    },
    []
  )

  const { totalSpend, totalConversions, blendedRoas } = React.useMemo(() => {
    const totalSpend = data.reduce((sum, c) => sum + c.spend, 0)
    const totalConversions = data.reduce((sum, c) => sum + c.conversions, 0)
    const totalRevenue = data.reduce((sum, c) => sum + c.spend * c.roas, 0)
    return { totalSpend, totalConversions, blendedRoas: totalSpend === 0 ? 0 : totalRevenue / totalSpend }
  }, [data])

  return (
    <div className="w-full space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h3 className="font-semibold">Campaign Performance</h3>
        <p className="text-sm text-muted-foreground">Last 30 days, across every active channel.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Spend" value={spendFormatter.format(totalSpend)} />
        <StatCard label="Conversions" value={totalConversions.toLocaleString()} />
        <StatCard label="Blended ROAS" value={\`\${blendedRoas.toFixed(1)}x\`} />
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
}`

const PAGE_MARKDOWN = `# Marketing Campaigns Block

A campaign performance grid: channel/status filters, spend/conversions
footer totals, a profitability-colored ROAS column, and a "Pause"/"Archive"
bulk actions dropdown. Works with: Data Table.

\`\`\`tsx
${CODE}
\`\`\`
`

export default function MarketingCampaignsBlockPage() {
  return (
    <div className="max-w-4xl space-y-16">
      <PageHeader
        title="Marketing Campaigns"
        actions={
          <CopyPageMenu
            markdown={PAGE_MARKDOWN}
            url="/docs/blocks/marketing-campaigns"
          />
        }
        description="A campaign performance grid — spend/conversions totals above the table, and a profitability-colored ROAS column."
      />

      <Section
        id="preview"
        title="Preview"
        description="Composed entirely from Data Table + Field Types: ROAS uses a raw ColumnDef escape hatch for threshold coloring; everything else is built with defineColumns."
      >
        <WorksWith components={["data-table"]} />
        <ComponentPreview
          align="start"
          preview={<MarketingCampaignsBlock />}
          code={CODE}
          filename="marketing-campaigns-block.tsx"
        />
      </Section>
    </div>
  )
}
