"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Building2 } from "lucide-react"
import { singleSelectCell, dateCell, percentCell } from "@/components/table-fields"

import { DataTable } from "@/components/data-table"
import type {
  DimensionDef,
  FilterDef,
  GroupColumnConfig,
} from "@/components/data-table"
import { DimensionPicker } from "@/components/dimension-picker"

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
  { id: "2", company: "Globex Trading", contact: "Sam Patel", stage: "proposal", owner: "diego-alvarez", value: 22000, probability: 0.4, closeDate: "2026-08-05" },
  { id: "3", company: "Initech Software", contact: "Alex Kim", stage: "won", owner: "maria-chen", value: 61000, probability: 1, closeDate: "2026-07-10" },
  { id: "4", company: "Umbrella Health", contact: "Taylor Brooks", stage: "qualified", owner: "priya-nair", value: 15500, probability: 0.25, closeDate: "2026-08-20" },
  { id: "5", company: "Wayne Industries", contact: "Morgan Reyes", stage: "lead", owner: "diego-alvarez", value: 9000, probability: 0.1, closeDate: "2026-09-01" },
  { id: "6", company: "Stark Manufacturing", contact: "Casey Nolan", stage: "negotiation", owner: "priya-nair", value: 73500, probability: 0.6, closeDate: "2026-07-31" },
  { id: "7", company: "Hooli Cloud", contact: "Riley Foster", stage: "lost", owner: "maria-chen", value: 18000, probability: 0, closeDate: "2026-06-15" },
  { id: "8", company: "Soylent Foods", contact: "Drew Sanders", stage: "proposal", owner: "diego-alvarez", value: 31000, probability: 0.45, closeDate: "2026-08-12" },
  { id: "9", company: "Vandelay Industries", contact: "Jamie Ortiz", stage: "won", owner: "priya-nair", value: 27500, probability: 1, closeDate: "2026-07-04" },
  { id: "10", company: "Massive Dynamic", contact: "Cameron Blake", stage: "qualified", owner: "maria-chen", value: 41200, probability: 0.3, closeDate: "2026-08-25" },
]

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

// Stage/Owner columns use table-fields' *Cell helpers directly (the raw
// ColumnDef escape hatch) rather than defineColumns — grouped columns render
// through the auto group column, not through the col.*-built cell wrapper.
// See Field Types' "Display-only usage" section.
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
        <p className="text-sm text-muted-foreground">
          10 open and closed deals, grouped by stage.
        </p>
      </div>

      <DataTable<Deal>
        data={DEALS}
        columns={columns}
        filterableColumns={filterableColumns}
        grouping={{
          dimensions: groupableDimensions,
          initial: ["stage"],
          column: groupColumn,
          renderControl: ({ dimensions, grouping, setGrouping }) => (
            <DimensionPicker
              dimensions={dimensions}
              grouping={grouping}
              onGroupingChange={setGrouping}
            />
          ),
        }}
      />
    </div>
  )
}
