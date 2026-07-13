import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { ReservationsBlock } from "@/components/site/reservations-block"

const CODE = `"use client"

import * as React from "react"
import { Ban, CalendarCheck } from "lucide-react"
import { toast } from "sonner"

import {
  DataTable,
  defineColumns,
  type DataTableAction,
} from "@/components/data-table"

type Booking = {
  id: string
  guestName: string
  roomType: string
  checkIn: string
  checkOut: string
  nights: number
  status: string
  total: number
}

const ROOM_TYPES = [
  { label: "Standard", value: "standard" },
  { label: "Deluxe", value: "deluxe" },
  { label: "Suite", value: "suite" },
  { label: "Penthouse", value: "penthouse" },
]

const STATUSES = [
  { label: "Confirmed", value: "confirmed" },
  { label: "Pending", value: "pending" },
  { label: "Checked in", value: "checked-in" },
  { label: "Checked out", value: "checked-out" },
  { label: "Cancelled", value: "cancelled" },
]

const BOOKINGS: Booking[] = [
  { id: "1", guestName: "Elena Ruiz", roomType: "deluxe", checkIn: "2026-07-14", checkOut: "2026-07-17", nights: 3, status: "confirmed", total: 690 },
  // ...more rows
]

const revenueFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const col = defineColumns<Booking>()
const columns = [
  col.text("guestName", { header: "Guest" }),
  col.singleSelect("roomType", { header: "Room", options: ROOM_TYPES }),
  col.date("checkIn", { header: "Check-in" }),
  col.date("checkOut", { header: "Check-out" }),
  col.number("nights", { header: "Nights" }),
  col.singleSelect("status", { header: "Status", options: STATUSES }),
  col.currency("total", { header: "Total" }),
]

const actions: DataTableAction<Booking>[] = [
  {
    id: "confirm",
    label: "Confirm",
    icon: CalendarCheck,
    onClick: ({ rows }) => toast(\`Confirmed \${rows.length} booking\${rows.length === 1 ? "" : "s"}\`),
  },
  {
    id: "cancel",
    label: "Cancel",
    icon: Ban,
    variant: "destructive",
    onClick: ({ rows }) => toast(\`Cancelled \${rows.length} booking\${rows.length === 1 ? "" : "s"}\`),
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

export function ReservationsBlock() {
  const [data, setData] = React.useState(BOOKINGS)

  const handleUpdateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setData((prev) => prev.map((row) => (row.id === rowId ? { ...row, [columnId]: value } : row)))
    },
    []
  )

  const { totalBookings, revenue, avgStay } = React.useMemo(() => {
    const totalBookings = data.length
    const revenue = data.reduce((sum, b) => sum + b.total, 0)
    const avgStay = totalBookings === 0 ? 0 : data.reduce((sum, b) => sum + b.nights, 0) / totalBookings
    return { totalBookings, revenue, avgStay }
  }, [data])

  return (
    <div className="w-full space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h3 className="font-semibold">Bookings</h3>
        <p className="text-sm text-muted-foreground">July – August 2026, across every room type.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Bookings" value={totalBookings.toLocaleString()} />
        <StatCard label="Revenue" value={revenueFormatter.format(revenue)} />
        <StatCard label="Avg Stay" value={\`\${avgStay.toFixed(1)} nights\`} />
      </div>

      <DataTable<Booking>
        data={data}
        columns={columns}
        getRowId={(row) => row.id}
        editable
        onUpdateData={handleUpdateData}
        enableRowSelection
        enablePagination={false}
        actions={actions}
        filterableColumns={[
          { id: "roomType", label: "Room", type: "select", options: ROOM_TYPES },
          { id: "status", label: "Status", type: "select", options: STATUSES },
          { id: "checkIn", label: "Check-in", type: "date" },
        ]}
        calculableColumns={[
          { columnId: "total", default: "sum" },
          { columnId: "nights", methods: ["sum", "avg"], default: "avg" },
        ]}
      />
    </div>
  )
}`

const PAGE_MARKDOWN = `# Reservations Block

A bookings table: room/status filters, a date filter on check-in (before/
after/between), footer totals, and a "Confirm"/"Cancel" bulk actions
dropdown. Works with: Data Table.

\`\`\`tsx
${CODE}
\`\`\`
`

export default function ReservationsBlockPage() {
  return (
    <div className="max-w-4xl space-y-16">
      <PageHeader
        title="Reservations"
        actions={
          <CopyPageMenu
            markdown={PAGE_MARKDOWN}
            url="/docs/blocks/reservations"
          />
        }
        description="A bookings table with room/status filters, a check-in date filter, and footer totals."
      />

      <Section
        id="preview"
        title="Preview"
        description="Composed entirely from Data Table + Field Types: filterableColumns' date type offers before/after/between operators on Check-in."
      >
        <WorksWith components={["data-table"]} />
        <ComponentPreview
          align="start"
          preview={<ReservationsBlock />}
          code={CODE}
          filename="reservations-block.tsx"
        />
      </Section>
    </div>
  )
}
