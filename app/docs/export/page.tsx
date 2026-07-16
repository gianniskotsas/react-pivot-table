import { ApiTable, apiRowsToMarkdown, type ApiRow } from "@/components/site/api-table"
import { CodeBlock } from "@/components/site/code-block"
import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { ToasterCallout, TOASTER_MARKDOWN } from "@/components/site/toaster-callout"
import { WorksWith } from "@/components/site/works-with"
import { ExportDataTableDemo } from "@/components/site/data-table-demos"

const USAGE_CODE = `<DataTable
  data={rows}
  columns={columns}
  getRowId={(row) => row.id}
  // Export is on by default — the button downloads the current
  // sorted/filtered/visible view as CSV.
/>`

const DISABLE_CODE = `// Hide the button on tables that shouldn't leak data (or where a
// feature demo just doesn't need it):
<DataTable data={rows} columns={columns} enableExport={false} />`

const API_ROWS: ApiRow[] = [
  {
    name: "enableExport?",
    type: "boolean",
    defaultValue: "true",
    description:
      "Shows the toolbar's Export button. The CSV is RFC 4180, serialized per column with the same formatter its cells use, hidden columns excluded, and formula-injection–neutralized for fields starting with =, +, -, or @.",
  },
]

const PAGE_MARKDOWN = `# Export Data

The toolbar's Export button downloads the table's current sorted/filtered/
visible view as a CSV — hidden columns are excluded, and each column's value
is serialized with the same formatter Field Types uses for the cell itself
(currency, date, etc.). Select rows first and the export narrows to just those.
Set enableExport={false} to hide it. Works with: Data Table.

## Installation
\`\`\`
npx shadcn@latest add @kotsas-ui/data-table
\`\`\`
${TOASTER_MARKDOWN}

## Usage
\`\`\`tsx
${USAGE_CODE}
\`\`\`

## Examples
\`\`\`tsx
${DISABLE_CODE}
\`\`\`

## API Reference
${apiRowsToMarkdown(API_ROWS)}
`

export default function ExportDataPage() {
  return (
    <div className="space-y-16">
      <PageHeader
        title="Export Data"
        actions={<CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/export" />}
        description="One click downloads a CSV of exactly what's on screen — sorted, filtered, and with hidden columns excluded. Select rows to export just those."
      />

      <Section
        id="installation"
        title="Installation"
        description="Export ships with Data Table — no separate install."
      >
        <WorksWith components={["data-table"]} />
        <InstallTabs package="@kotsas-ui/data-table" />
        <ToasterCallout />
      </Section>

      <Section
        id="usage"
        title="Usage"
        description="On by default. Each column serializes with the same formatter its cell uses (currency, date, percent, …), so the CSV matches what users see, not raw values. Select one or more rows and the export narrows to just those."
      >
        <ComponentPreview preview={<ExportDataTableDemo />} code={USAGE_CODE} />
      </Section>

      <Section
        id="examples"
        title="Examples"
        description="Turn the button off with enableExport={false}:"
      >
        <CodeBlock code={DISABLE_CODE} />
      </Section>

      <Section id="api" title="API Reference">
        <ApiTable rows={API_ROWS} />
      </Section>
    </div>
  )
}
