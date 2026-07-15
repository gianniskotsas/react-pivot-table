import { ApiTable, apiRowsToMarkdown, type ApiRow } from "@/components/site/api-table"
import { CodeBlock } from "@/components/site/code-block"
import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { BasicDataTableDemo } from "@/components/site/data-table-demos"

const USAGE_CODE = `// Every col.* method is resizable by default — drag a column's right edge,
// or double-click it to reset back to the default width.
const col = defineColumns<Task>()
const columns = [
  col.text("title"),
  col.currency("budget"),
]`

const SIZE_CODE = `// Set a starting width, or lock a column's width entirely.
col.currency("budget", { size: 160 })
col.text("id", { enableResizing: false })`

const API_ROWS: ApiRow[] = [
  {
    name: "enableResizing?",
    type: "boolean",
    defaultValue: "true",
    description:
      "Per-column option on every col.* method. When false, the header renders no drag handle.",
  },
  {
    name: "size?",
    type: "number",
    defaultValue: "150",
    description:
      "Starting width in px. Double-clicking a column's drag handle resets back to this.",
  },
]

const PAGE_MARKDOWN = `# Column Resizing

Drag a column's right edge to resize it; double-click to reset back to its
default width. Every defineColumns field is resizable by default. Works
with: Data Table.

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
${SIZE_CODE}
\`\`\`

## API Reference
${apiRowsToMarkdown(API_ROWS)}
`

export default function ColumnResizingPage() {
  return (
    <div className="space-y-16">
      <PageHeader
        title="Column Resizing"
        actions={
          <CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/column-resizing" />
        }
        description="Drag a column's right edge to resize it; double-click to reset back to its default width."
      />

      <Section
        id="installation"
        title="Installation"
        description="Column resizing ships with Data Table — no separate install."
      >
        <WorksWith components={["data-table"]} />
        <InstallTabs package="@kotsas-ui/data-table" />
      </Section>

      <Section
        id="usage"
        title="Usage"
        description="Every field built with defineColumns is resizable by default — hover a header's right edge for the drag handle."
      >
        <ComponentPreview preview={<BasicDataTableDemo />} code={USAGE_CODE} />
      </Section>

      <Section
        id="examples"
        title="Examples"
        description="Set a starting width with size, or lock a column with enableResizing: false:"
      >
        <CodeBlock code={SIZE_CODE} />
      </Section>

      <Section id="api" title="API Reference">
        <ApiTable rows={API_ROWS} />
      </Section>
    </div>
  )
}
