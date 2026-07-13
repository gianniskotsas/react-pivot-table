import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { BasicDataTableDemo } from "@/components/site/data-table-demos"

const CODE = `// Every col.* method is resizable by default — drag a column's right edge,
// or double-click it to reset back to the default width.
col.text("title")
col.currency("budget", { size: 160 }) // fixed starting width in px

// Opt a column out explicitly:
col.text("id", { enableResizing: false })`

const PAGE_MARKDOWN = `# Column Resizing

Drag a column's right edge to resize it; double-click to reset back to its
default width. Every defineColumns field is resizable by default. Works
with: Data Table.

\`\`\`tsx
${CODE}
\`\`\`
`

export default function ColumnResizingPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Column Resizing"
        actions={
          <CopyPageMenu
            markdown={PAGE_MARKDOWN}
            url="/docs/column-resizing"
          />
        }
        description="Drag a column's right edge to resize it; double-click to reset back to its default width."
      />

      <Section
        id="usage"
        title="Usage"
        description="Every field built with defineColumns is resizable by default. Opt a column out with enableResizing: false, or set a starting width with size."
      >
        <WorksWith components={["data-table"]} />
        <ComponentPreview preview={<BasicDataTableDemo />} code={CODE} />
      </Section>
    </div>
  )
}
