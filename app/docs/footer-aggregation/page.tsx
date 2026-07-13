import Link from "next/link"

import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { FooterAggregationDataTableDemo } from "@/components/site/data-table-demos"

const CODE = `<DataTable<Task>
  data={rows}
  columns={columns}
  calculableColumns={[
    { columnId: "hours", default: "sum" },
    { columnId: "budget", methods: ["sum", "avg"], default: "sum" },
  ]}
/>`

const PAGE_MARKDOWN = `# Footer & Aggregation

calculableColumns adds a footer method picker (sum/avg/min/max/count) per
column. It automatically scopes to the current row selection when one
exists, falling back to every visible row otherwise. Works with: Data Table.

\`\`\`tsx
${CODE}
\`\`\`

Grouped Data Table has a related but different mechanism: per-column
\`aggregationFn\` on the ColumnDef, computed per group rather than shown in a
table-wide footer — see Grouping & Hierarchy.
`

export default function FooterAggregationPage() {
  return (
    <div className="max-w-3xl space-y-16">
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
        id="usage"
        title="Usage"
        description={
          <>
            List the columns in{" "}
            <code className="font-mono">calculableColumns</code>. The footer
            cell shows a method picker; selecting rows via{" "}
            <code className="font-mono">enableRowSelection</code>
            {" narrows the scope from "}&quot;every visible row&quot;
            {" to just the selection."}
          </>
        }
      >
        <WorksWith components={["data-table"]} />
        <ComponentPreview preview={<FooterAggregationDataTableDemo />} code={CODE} />
      </Section>

      <Section
        id="grouped-data-table"
        title="In Grouped Data Table"
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
