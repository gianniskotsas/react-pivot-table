import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
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
  groupColumn={{
    header: "Account",
    leaf: {
      icon: () => <Landmark className="size-4 text-muted-foreground" />,
      primary: (row) => row.original.accountName,
      secondary: (row) => row.original.iban,
    },
  }}
/>`

const PAGE_MARKDOWN = `# Grouping & Hierarchy

AG-Grid-style row grouping and drill-down: a single auto group column with
indented hierarchy, expand/collapse, drag-and-drop dimension reordering, and
per-group counts/aggregation. Works with: Grouped Data Table.

## Basic usage
\`\`\`tsx
${SIMPLE_USAGE}
\`\`\`

## Rich leaf
\`\`\`tsx
${RICH_USAGE}
\`\`\`
`

export default function GroupingPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Grouping & Hierarchy"
        actions={<CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/grouping" />}
        description="A single auto group column with indented hierarchy, expand/collapse, drag-and-drop dimension reordering, and per-group counts/aggregation."
      />

      <Section
        id="usage"
        title="Usage"
        description="Group by a single dimension with a name-only leaf — the smallest useful config."
      >
        <WorksWith components={["grouped-data-table"]} />
        <ComponentPreview
          preview={<SimpleDemo />}
          code={SIMPLE_USAGE}
          filename="demo.tsx"
        />
      </Section>

      <Section
        id="rich-leaf"
        title="Two-level grouping & a rich leaf"
        description={
          <>
            The left-most column renders the hierarchy. For leaf rows, use the
            declarative <code className="font-mono">leaf</code> (primary
            required; icon and secondary optional), or{" "}
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
