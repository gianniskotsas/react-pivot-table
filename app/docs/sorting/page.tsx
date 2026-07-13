import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { BasicDataTableDemo } from "@/components/site/data-table-demos"

const CODE = `// Every col.* method is sortable by default — click a header to sort.
col.text("title")
col.currency("budget")

// Opt a column out explicitly:
col.text("id", { enableSorting: false })`

const PAGE_MARKDOWN = `# Sorting

Click a column header to cycle ascending / descending / none. Every field
built with defineColumns is sortable by default — no configuration required.
Works with: Data Table.

\`\`\`tsx
${CODE}
\`\`\`
`

export default function SortingPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Sorting"
        actions={
          <CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/sorting" />
        }
        description="Click a column header to cycle ascending / descending / none — no configuration required."
      />

      <Section
        id="usage"
        title="Usage"
        description="Every field built with defineColumns is sortable by default. Opt a column out with enableSorting: false."
      >
        <WorksWith components={["data-table"]} />
        <ComponentPreview preview={<BasicDataTableDemo />} code={CODE} />
      </Section>
    </div>
  )
}
