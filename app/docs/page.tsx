import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ComponentPreview } from "@/components/site/component-preview"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { SimpleDemo } from "@/components/site/simple-demo"
import { AccountsTable } from "@/app/(examples)/accounts/accounts-table"
import { accounts } from "@/app/(examples)/accounts/data"

const SIMPLE_USAGE = `import { GroupedDataTable } from "@/components/grouped-data-table"
import type { ColumnDef } from "@tanstack/react-table"

type Account = { id: string; entity: string; bank: string; balance: number }

const columns: ColumnDef<Account, unknown>[] = [
  { id: "entity", accessorKey: "entity", header: "Entity", enableGrouping: true },
  { id: "bank", accessorKey: "bank", header: "Bank", enableGrouping: true },
  { id: "balance", accessorKey: "balance", header: "Balance", aggregationFn: "sum" },
]

export function Demo({ data }: { data: Account[] }) {
  return (
    <GroupedDataTable<Account>
      data={data}
      columns={columns}
      groupableDimensions={[
        { id: "entity", label: "Entity" },
        { id: "bank", label: "Bank" },
      ]}
      initialGrouping={["entity"]}
      groupColumn={{
        header: "Account",
        // name-only leaf — no icon or secondary line
        leaf: { primary: (row) => row.original.accountName },
      }}
    />
  )
}`

const RICH_USAGE = `<GroupedDataTable<Account>
  data={accounts}
  columns={columns}
  groupableDimensions={[
    { id: "entity", label: "Entity" },
    { id: "bank", label: "Bank" },
  ]}
  initialGrouping={["entity", "bank"]}
  filterableColumns={[
    { id: "entity", label: "Entity", type: "select", options },
    { id: "bank", label: "Bank", type: "select", options },
    { id: "balance", label: "Balance", type: "number" },
  ]}
  groupColumn={{
    header: "Account",
    leaf: {
      icon: () => <Landmark className="size-4 text-muted-foreground" />,
      primary: (row) => row.original.accountName,
      secondary: (row) => row.original.iban,
    },
  }}
/>
// types: "text" | "number" | "select" | "date"
// operators are readable: is / is not / contains / does not contain /
// is any of / is none of / greater than / less than / between …`

const PROPS: { name: string; type: string; desc: string }[] = [
  { name: "data", type: "TData[]", desc: "The rows to display." },
  {
    name: "columns",
    type: "ColumnDef<TData>[]",
    desc: "TanStack column defs for measure/attribute columns. Mark groupable ones with enableGrouping.",
  },
  {
    name: "groupColumn",
    type: "GroupColumnConfig<TData>",
    desc: "The synthesized group column: header, leaf (primary/icon?/secondary?) or renderLeaf, and countMode.",
  },
  {
    name: "groupableDimensions",
    type: "DimensionDef[]",
    desc: "Columns the user may group by (shown in the Group by picker).",
  },
  {
    name: "initialGrouping?",
    type: "string[]",
    desc: 'Initial hierarchy order, e.g. ["entity", "bank"]. Applied at mount.',
  },
  {
    name: "filterableColumns?",
    type: "FilterDef[]",
    desc: "Columns the user may filter, with type + operators.",
  },
  {
    name: "initialFilterState?",
    type: "FilterState",
    desc: "Initial AND/OR filter groups.",
  },
  {
    name: "enablePagination?",
    type: "boolean",
    desc: "Client-side pagination. Default true.",
  },
]

export default function DocsPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Grouped Data Table"
        description="An AG-Grid-style grouping / drill-down table for React, distributed as a shadcn registry component."
      />

      {/* Installation */}
      <Section
        id="installation"
        title="Installation"
        description={
          <>
            Two builds — <code className="font-mono">grouped-data-table</code>{" "}
            for Base UI shadcn projects,{" "}
            <code className="font-mono">grouped-data-table-radix</code> for
            Radix UI projects.
          </>
        }
      >
        <InstallTabs package="@kotsas-ui/grouped-data-table" />
      </Section>

      {/* Usage */}
      <Section
        id="usage"
        title="Usage"
        description="Group by a single dimension with a name-only leaf — the smallest useful config."
      >
        <ComponentPreview
          preview={<SimpleDemo />}
          code={SIMPLE_USAGE}
          filename="demo.tsx"
        />
      </Section>

      {/* Props */}
      <Section id="props" title="Props">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Prop</TableHead>
                <TableHead className="w-52">Type</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PROPS.map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="font-mono text-xs">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.type}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.desc}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      {/* Rich example */}
      <Section
        id="group-column"
        title="Grouping, filters & rich leaf"
        description={
          <>
            Two-level grouping, AND/OR filter groups, and a leaf with an icon,
            name, and secondary line. The left-most column renders the hierarchy
            — use the declarative <code className="font-mono">leaf</code>{" "}
            (primary required; icon and secondary optional), or{" "}
            <code className="font-mono">renderLeaf</code> for full control.
          </>
        }
      >
        <ComponentPreview
          align="start"
          preview={<AccountsTable data={accounts} />}
          code={RICH_USAGE}
        />
      </Section>
    </div>
  )
}
