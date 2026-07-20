import Link from "next/link"

import { ApiTable, apiRowsToMarkdown, type ApiRow } from "@/components/site/api-table"
import { CodeBlock } from "@/components/site/code-block"
import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { FooterAggregationDataTableDemo } from "@/components/site/data-table-demos"

const USAGE_CODE = `<DataTable<Task>
  data={rows}
  columns={columns}
  enableRowSelection
  calculableColumns={[
    { columnId: "hours", default: "sum" },
    { columnId: "budget", methods: ["sum", "avg"], default: "sum" },
  ]}
/>`

const SERVER_CODE = `// With server-driven pagination, scopes that exceed the loaded rows
// ("all matching") are computed by your backend:
<DataTable
  data={loadedPage}
  columns={columns}
  manualPagination
  totalRowCount={8412}
  calculableColumns={[{ columnId: "amount", default: "sum" }]}
  computeAggregate={async ({ columnId, method, scope }) => {
    const res = await fetch(\`/api/aggregate?col=\${columnId}&fn=\${method}&scope=\${scope}\`)
    return (await res.json()).value
  }}
/>`

const API_ROWS: ApiRow[] = [
  {
    name: "calculableColumns?",
    type: "CalculableColumn[]",
    description:
      "Which columns get a footer method picker. Scopes automatically to the current row selection when one exists, else every visible row.",
  },
  {
    name: "CalculableColumn.methods?",
    type: "AggregationMethod[]",
    defaultValue: "all five",
    description: "Methods offered in the picker: sum / avg / min / max / count.",
  },
  {
    name: "CalculableColumn.default?",
    type: "AggregationMethod | null",
    defaultValue: "null",
    description: "Method active before the user picks one; null renders the picker unset.",
  },
  {
    name: "computeAggregate?",
    type: "(args) => Promise<number>",
    description:
      'Server-side aggregate for scopes exceeding what\'s loaded (manualPagination) — e.g. "sum across all matching rows." Without it, such values render with a partial qualifier.',
  },
]

const PAGE_MARKDOWN = `# Footer & Aggregation

calculableColumns adds a footer method picker (sum/avg/min/max/count) per
column. It automatically scopes to the current row selection when one
exists, falling back to every visible row otherwise. Works with: Data Table.

## Installation
\`\`\`
npx shadcn@latest add @kotsas-ui/data-table
\`\`\`

## Usage
\`\`\`tsx
${USAGE_CODE}
\`\`\`

## Examples
\`\`\`tsx
${SERVER_CODE}
\`\`\`

## API Reference
${apiRowsToMarkdown(API_ROWS)}

Data Table's grouping has a related but different mechanism: per-column
aggregationFn on the ColumnDef, computed per group rather than shown in a
table-wide footer — see Grouping & Hierarchy.
`

export default function FooterAggregationPage() {
  return (
    <div className="space-y-16">
      <PageHeader
        title="Footer & Aggregation"
        actions={
          <CopyPageMenu
            markdown={PAGE_MARKDOWN}
            url="/docs/footer-aggregation"
          />
        }
        description="A footer method picker (sum/avg/min/max/count) per column, scoped to the current row selection when one exists."
      />

      <Section
        id="installation"
        title="Installation"
        description="Footer aggregation ships with Data Table — no separate install."
      >
        <WorksWith components={["data-table"]} />
        <InstallTabs package="@kotsas-ui/data-table" />
      </Section>

      <Section
        id="usage"
        title="Usage"
        description="List the columns in calculableColumns. Select a few rows and watch the footer narrow its scope from every visible row to just the selection."
      >
        <ComponentPreview
          preview={<FooterAggregationDataTableDemo />}
          code={USAGE_CODE}
        />
      </Section>

      <Section
        id="examples"
        title="Examples"
        description="When pagination is server-driven, provide computeAggregate so scopes beyond the loaded rows come from your backend:"
      >
        <CodeBlock code={SERVER_CODE} />
      </Section>

      <Section id="api" title="API Reference">
        <ApiTable rows={API_ROWS} />
      </Section>

      <Section
        id="grouping"
        title="With Grouping"
        description="A related but different mechanism: per-column aggregationFn on the ColumnDef, computed per group rather than shown in a table-wide footer."
      >
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          See{" "}
          <Link href="/docs/grouping" className="underline underline-offset-4">
            Grouping &amp; Hierarchy
          </Link>{" "}
          for group-level aggregation.
        </div>
      </Section>
    </div>
  )
}
