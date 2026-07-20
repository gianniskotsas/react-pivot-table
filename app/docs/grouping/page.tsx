import { ApiTable, apiRowsToMarkdown, type ApiRow } from "@/components/site/api-table"
import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { SimpleDemo } from "@/components/site/simple-demo"
import { AccountsTable } from "@/app/(examples)/accounts/accounts-table"
import { accounts } from "@/app/(examples)/accounts/data"

const USAGE_CODE = `import { DataTable } from "@/components/data-table"
import { DimensionPicker } from "@/components/dimension-picker"
import type { ColumnDef } from "@tanstack/react-table"

type Account = { id: string; entity: string; bank: string; balance: number }

const columns: ColumnDef<Account, unknown>[] = [
  { id: "entity", accessorKey: "entity", header: "Entity", enableGrouping: true },
  { id: "bank", accessorKey: "bank", header: "Bank", enableGrouping: true },
  { id: "balance", accessorKey: "balance", header: "Balance", aggregationFn: "sum" },
]

export function Demo({ data }: { data: Account[] }) {
  return (
    <DataTable<Account>
      data={data}
      columns={columns}
      grouping={{
        dimensions: [
          { id: "entity", label: "Entity" },
          { id: "bank", label: "Bank" },
        ],
        initial: ["entity"],
        // name-only leaf — no icon or secondary line
        column: {
          header: "Account",
          leaf: { primary: (row) => row.original.accountName },
        },
        renderControl: ({ dimensions, grouping, setGrouping }) => (
          <DimensionPicker
            dimensions={dimensions}
            grouping={grouping}
            onGroupingChange={setGrouping}
          />
        ),
      }}
    />
  )
}`

const RICH_CODE = `<DataTable<Account>
  data={accounts}
  columns={columns}
  filterableColumns={filterableColumns}
  grouping={{
    dimensions: [
      { id: "entity", label: "Entity" },
      { id: "bank", label: "Bank" },
    ],
    initial: ["entity", "bank"],
    column: {
      header: "Account",
      countMode: "leaf",
      leaf: {
        icon: () => <Landmark className="size-4 shrink-0 text-muted-foreground" />,
        primary: (row) => row.original.accountName,
        secondary: (row) => row.original.iban,
      },
    },
    renderControl: ({ dimensions, grouping, setGrouping }) => (
      <DimensionPicker
        dimensions={dimensions}
        grouping={grouping}
        onGroupingChange={setGrouping}
      />
    ),
  }}
/>`

const API_ROWS: ApiRow[] = [
  {
    name: "grouping.dimensions",
    type: "{ id; label }[]",
    description:
      "Which columns the Group-by picker offers. Each id must match a column with enableGrouping: true.",
  },
  {
    name: "grouping.initial?",
    type: "string[]",
    defaultValue: "[]",
    description:
      "Hierarchy order at mount, e.g. [\"entity\", \"bank\"]. Applied once — use the renderControl slot's setGrouping to change it after mount.",
  },
  {
    name: "grouping.renderControl?",
    type: "(ctx) => ReactNode",
    description:
      "Toolbar control for changing the hierarchy at runtime. Pass Dimension Picker's <DimensionPicker /> here, or omit for a fixed hierarchy.",
  },
  {
    name: "grouping.column.header?",
    type: "ReactNode",
    description: "Header text for the synthesized group column.",
  },
  {
    name: "grouping.column.leaf?",
    type: "{ primary; secondary?; icon? }",
    description:
      "Declarative leaf rendering — a primary label with optional icon and muted secondary line.",
  },
  {
    name: "grouping.column.renderLeaf?",
    type: "(row) => ReactNode",
    description: "Full-control leaf renderer; takes precedence over leaf.",
  },
  {
    name: "grouping.column.countMode?",
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
per-group counts/aggregation. Works with: Data Table, Dimension Picker.

## Installation
\`\`\`
npx shadcn@latest add @kotsas-ui/data-table
\`\`\`

Optional — install this too if you want users to change grouping at runtime:
\`\`\`
npx shadcn@latest add @kotsas-ui/dimension-picker
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
    <div className="space-y-16">
      <PageHeader
        title="Grouping & Hierarchy"
        actions={<CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/grouping" />}
        description="A single auto group column with indented hierarchy, expand/collapse, drag-and-drop dimension reordering, and per-group counts/aggregation."
      />

      <Section
        id="installation"
        title="Installation"
        description="Grouping is an opt-in prop on Data Table — pass grouping and get an auto group column, expand/collapse, and per-group aggregation. Dimension Picker adds a drag-and-drop control for changing the hierarchy at runtime; it's optional and the only piece that depends on dnd-kit."
      >
        <WorksWith components={["data-table", "dimension-picker"]} />
        <InstallTabs package="@kotsas-ui/data-table" />
        <InstallTabs package="@kotsas-ui/dimension-picker" className="mt-3" />
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
