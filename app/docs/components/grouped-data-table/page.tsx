import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { SeeAlso } from "@/components/site/see-also"
import { SimpleDemo } from "@/components/site/simple-demo"

const USAGE = `import { GroupedDataTable } from "@/components/grouped-data-table"
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
        leaf: { primary: (row) => row.original.accountName },
      }}
    />
  )
}`

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

const PAGE_MARKDOWN = `# Grouped Data Table

An AG-Grid-style grouping / drill-down table for React.

## Installation
\`\`\`
npx shadcn@latest add @kotsas-ui/grouped-data-table
\`\`\`

## Usage
\`\`\`tsx
${USAGE}
\`\`\`

## Props
${PROPS.map((p) => `- \`${p.name}\` (${p.type}): ${p.desc}`).join("\n")}
`

export default function GroupedDataTableComponentPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Grouped Data Table"
        actions={
          <CopyPageMenu
            markdown={PAGE_MARKDOWN}
            url="/docs/components/grouped-data-table"
          />
        }
        description="An AG-Grid-style grouping / drill-down table for React, distributed as a shadcn registry component."
      />

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

      <Section
        id="usage"
        title="Usage"
        description="Group by a single dimension with a name-only leaf — the smallest useful config."
      >
        <ComponentPreview
          preview={<SimpleDemo />}
          code={USAGE}
          filename="demo.tsx"
        />
      </Section>

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

      <Section id="see-also" title="See also">
        <SeeAlso
          links={[
            { href: "/docs/grouping", label: "Grouping & Hierarchy" },
            { href: "/docs/sorting-filtering", label: "Sorting & Filtering" },
          ]}
        />
      </Section>
    </div>
  )
}
