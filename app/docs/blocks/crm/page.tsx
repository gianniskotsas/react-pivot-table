import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { CrmBlock } from "@/components/site/crm-block"

const CODE = `"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Building2 } from "lucide-react"
import { singleSelectCell, dateCell, percentCell } from "@/components/table-fields"

import { GroupedDataTable } from "@/components/grouped-data-table"
import type {
  DimensionDef,
  FilterDef,
  GroupColumnConfig,
} from "@/components/grouped-data-table"

type Deal = {
  id: string
  company: string
  contact: string
  stage: string
  owner: string
  value: number
  probability: number
  closeDate: string
}

const STAGES = [
  { label: "Lead", value: "lead" },
  { label: "Qualified", value: "qualified" },
  { label: "Proposal", value: "proposal" },
  { label: "Negotiation", value: "negotiation" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
]

const OWNERS = [
  { label: "Maria Chen", value: "maria-chen" },
  { label: "Diego Alvarez", value: "diego-alvarez" },
  { label: "Priya Nair", value: "priya-nair" },
]

const DEALS: Deal[] = [
  { id: "1", company: "Acme Robotics", contact: "Jordan Lee", stage: "negotiation", owner: "maria-chen", value: 48000, probability: 0.7, closeDate: "2026-07-28" },
  // ...more rows
]

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

// Stage/Owner columns use table-fields' *Cell helpers directly (the raw
// ColumnDef escape hatch) rather than defineColumns — GroupedDataTable, unlike
// DataTable, has no DataTableRuntimeContext for the col.*-built cell wrapper
// to read from. See Field Types' "Display-only usage" section.
const columns: ColumnDef<Deal, unknown>[] = [
  {
    id: "stage",
    accessorKey: "stage",
    header: "Stage",
    enableGrouping: true,
    cell: singleSelectCell<Deal>({ options: STAGES }),
  },
  {
    id: "owner",
    accessorKey: "owner",
    header: "Owner",
    enableGrouping: true,
    cell: singleSelectCell<Deal>({ options: OWNERS }),
  },
  {
    id: "value",
    accessorKey: "value",
    header: () => <div className="text-right">Value</div>,
    enableGrouping: false,
    aggregationFn: "sum",
    cell: ({ getValue }) => (
      <div className="px-3 py-2 text-right font-mono text-sm tabular-nums">
        {currencyFormatter.format(Number(getValue() ?? 0))}
      </div>
    ),
    aggregatedCell: ({ getValue }) => (
      <div className="px-3 py-2 text-right font-mono text-sm font-medium tabular-nums">
        {currencyFormatter.format(Number(getValue() ?? 0))}
      </div>
    ),
  },
  {
    id: "probability",
    accessorKey: "probability",
    header: () => <div className="text-right">Probability</div>,
    enableGrouping: false,
    // Without an explicit aggregationFn, TanStack defaults to summing group
    // members (e.g. 0.7 + 0.6 → a raw "1.2999999999999998") — "mean" is the
    // meaningful rollup for a per-deal probability.
    aggregationFn: "mean",
    cell: (ctx) => <div className="text-right">{percentCell<Deal>()(ctx)}</div>,
    aggregatedCell: ({ getValue }) => (
      <div className="px-3 py-2 text-right text-sm text-muted-foreground tabular-nums">
        avg {Math.round(Number(getValue() ?? 0) * 100)}%
      </div>
    ),
  },
  {
    id: "closeDate",
    accessorKey: "closeDate",
    header: "Close Date",
    enableGrouping: false,
    cell: dateCell<Deal>(),
  },
]

const groupableDimensions: DimensionDef[] = [
  { id: "stage", label: "Stage" },
  { id: "owner", label: "Owner" },
]

const groupColumn: GroupColumnConfig<Deal> = {
  header: "Deal",
  countMode: "leaf",
  leaf: {
    icon: () => <Building2 className="size-4 shrink-0 text-muted-foreground" />,
    primary: (row) => row.original.company,
    secondary: (row) => row.original.contact,
  },
}

const filterableColumns: FilterDef[] = [
  { id: "stage", label: "Stage", type: "select", options: STAGES },
  { id: "owner", label: "Owner", type: "select", options: OWNERS },
]

export function CrmBlock() {
  return (
    <div className="w-full space-y-4 rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div>
        <h3 className="font-semibold">Pipeline</h3>
        <p className="text-sm text-muted-foreground">10 open and closed deals, grouped by stage.</p>
      </div>

      <GroupedDataTable<Deal>
        data={DEALS}
        columns={columns}
        groupableDimensions={groupableDimensions}
        initialGrouping={["stage"]}
        groupColumn={groupColumn}
        filterableColumns={filterableColumns}
      />
    </div>
  )
}`

const PAGE_MARKDOWN = `# CRM Block

A ready-to-copy deals pipeline: grouped by stage (drag to regroup by owner
instead), with stage/owner filters, a per-group value subtotal, and a
company/contact leaf label. Works with: Grouped Data Table.

\`\`\`tsx
${CODE}
\`\`\`
`

export default function CrmBlockPage() {
  return (
    <div className="max-w-4xl space-y-16">
      <PageHeader
        title="CRM"
        actions={
          <CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/blocks/crm" />
        }
        description="A deals pipeline grouped by stage — drag Owner in front of Stage to regroup, or filter down to one rep."
      />

      <Section
        id="preview"
        title="Preview"
        description="Built on Grouped Data Table: stage/owner use table-fields' *Cell helpers directly, and Value sums per group automatically via aggregationFn."
      >
        <WorksWith components={["grouped-data-table"]} />
        <ComponentPreview
          align="start"
          preview={<CrmBlock />}
          code={CODE}
          filename="crm-block.tsx"
        />
      </Section>
    </div>
  )
}
