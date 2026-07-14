import { ApiTable, apiRowsToMarkdown, type ApiRow } from "@/components/site/api-table"
import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { SimpleDemo } from "@/components/site/simple-demo"
import { AccountsTable } from "@/app/(examples)/accounts/accounts-table"
import { accounts } from "@/app/(examples)/accounts/data"

const USAGE_CODE = `import { GroupedDataTable } from "@/components/grouped-data-table"
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

const RICH_CODE = `<GroupedDataTable<Account>
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

const API_ROWS: ApiRow[] = [
  {
    name: "groupableDimensions",
    type: "{ id; label }[]",
    description:
      "Which columns the Group-by picker offers. Each id must match a column with enableGrouping: true.",
  },
  {
    name: "initialGrouping?",
    type: "string[]",
    defaultValue: "[]",
    description:
      "Hierarchy order at mount, e.g. [\"entity\", \"bank\"]. Users reorder by dragging chips in the Group-by popover.",
  },
  {
    name: "groupColumn.header?",
    type: "ReactNode",
    description: "Header text for the synthesized group column.",
  },
  {
    name: "groupColumn.leaf?",
    type: "{ primary; secondary?; icon? }",
    description:
      "Declarative leaf rendering — a primary label with optional icon and muted secondary line.",
  },
  {
    name: "groupColumn.renderLeaf?",
    type: "(row) => ReactNode",
    description: "Full-control leaf renderer; takes precedence over leaf.",
  },
  {
    name: "groupColumn.countMode?",
    type: '"leaf" | "immediate"',
    defaultValue: '"leaf"',
    description:
      "How the (count) next to a group label is computed — total leaf descendants, or direct sub-rows.",
  },
  {
    name: "ColumnDef.aggregationFn?",
    type: '"sum" | "mean" | …',
    description:
      "Per-column TanStack aggregation shown on group rows (pair with aggregatedCell for formatting).",
  },
]

const PAGE_MARKDOWN = `# Grouping & Hierarchy

AG-Grid-style row grouping and drill-down: a single auto group column with
indented hierarchy, expand/collapse, drag-and-drop dimension reordering, and
per-group counts/aggregation. Works with: Grouped Data Table.

## Installation
\`\`\`
npx shadcn@latest add @kotsas-ui/grouped-data-table
\`\`\`

## Usage
\`\`\`tsx
${USAGE_CODE}
\`\`\`

## Examples
\`\`\`tsx
${RICH_CODE}
\`\`\`

## API Reference
${apiRowsToMarkdown(API_ROWS)}
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
        id="installation"
        title="Installation"
        description="Grouping is the heart of Grouped Data Table. Two builds — grouped-data-table for Base UI shadcn projects, grouped-data-table-radix for Radix UI projects."
      >
        <WorksWith components={["grouped-data-table"]} />
        <InstallTabs package="@kotsas-ui/grouped-data-table" />
      </Section>

      <Section
        id="usage"
        title="Usage"
        description="Group by a single dimension with a name-only leaf — the smallest useful config."
      >
        <ComponentPreview
          preview={<SimpleDemo />}
          code={USAGE_CODE}
          filename="demo.tsx"
        />
      </Section>

      <Section
        id="examples"
        title="Examples"
        description={
          <>
            Two-level grouping with a rich leaf: the left-most column renders
            the hierarchy, and leaf rows use the declarative{" "}
            <code className="font-mono">leaf</code> (primary required; icon and
            secondary optional) or <code className="font-mono">renderLeaf</code>{" "}
            for full control.
          </>
        }
      >
        <ComponentPreview
          align="start"
          preview={<AccountsTable data={accounts} />}
          code={RICH_CODE}
        />
      </Section>

      <Section id="api" title="API Reference">
        <ApiTable rows={API_ROWS} />
      </Section>
    </div>
  )
}
