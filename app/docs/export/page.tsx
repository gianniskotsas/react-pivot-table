import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { BasicDataTableDemo } from "@/components/site/data-table-demos"

const CODE = `<DataTable
  data={rows}
  columns={columns}
  getRowId={(row) => row.id}
  // Export is on by default — set enableExport={false} to hide the button.
/>`

const PAGE_MARKDOWN = `# Export Data

The toolbar's Export button downloads the table's current sorted/filtered/
visible view as a CSV — hidden columns are excluded, and each column's
value is serialized with the same formatter Field Types uses for the cell
itself (currency, date, etc.). Set \`enableExport={false}\` to hide it.
Works with: Data Table.

\`\`\`tsx
${CODE}
\`\`\`
`

export default function ExportDataPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Export Data"
        actions={<CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/export" />}
        description="One click downloads a CSV of exactly what's on screen — sorted, filtered, and with hidden columns excluded."
      />

      <Section
        id="usage"
        title="Usage"
        description="On by default. Each column serializes with the same formatter its cell uses (currency, date, percent, …), so the CSV matches what users see, not raw values."
      >
        <WorksWith components={["data-table"]} />
        <ComponentPreview preview={<BasicDataTableDemo />} code={CODE} />
      </Section>
    </div>
  )
}
