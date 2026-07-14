import { ApiTable, apiRowsToMarkdown, type ApiRow } from "@/components/site/api-table"
import { CodeBlock } from "@/components/site/code-block"
import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { BasicDataTableDemo } from "@/components/site/data-table-demos"

const USAGE_CODE = `// Every col.* method is sortable by default — click a header to sort.
const col = defineColumns<Task>()
const columns = [
  col.text("title"),
  col.currency("budget"),
]`

const OPT_OUT_CODE = `// Opt a column out — its header renders as plain text, no sort button.
col.text("id", { enableSorting: false })`

const API_ROWS: ApiRow[] = [
  {
    name: "enableSorting?",
    type: "boolean",
    defaultValue: "true",
    description:
      "Per-column option on every col.* method. When false, the header renders without a sort toggle.",
  },
]

const PAGE_MARKDOWN = `# Sorting

Click a column header to cycle ascending / descending / none — no
configuration required. Works with: Data Table.

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
${OPT_OUT_CODE}
\`\`\`

## API Reference
${apiRowsToMarkdown(API_ROWS)}
`

export default function SortingPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Sorting"
        actions={<CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/sorting" />}
        description="Click a column header to cycle ascending / descending / none — no configuration required."
      />

      <Section
        id="installation"
        title="Installation"
        description="Sorting ships with Data Table — no separate install."
      >
        <WorksWith components={["data-table"]} />
        <InstallTabs package="@kotsas-ui/data-table" />
      </Section>

      <Section
        id="usage"
        title="Usage"
        description="Every field built with defineColumns is sortable by default. Click a header to cycle ascending / descending / none."
      >
        <ComponentPreview preview={<BasicDataTableDemo />} code={USAGE_CODE} />
      </Section>

      <Section
        id="examples"
        title="Examples"
        description="Opt a column out when its order carries no meaning (internal ids, action columns):"
      >
        <CodeBlock code={OPT_OUT_CODE} />
      </Section>

      <Section id="api" title="API Reference">
        <ApiTable rows={API_ROWS} />
      </Section>
    </div>
  )
}
