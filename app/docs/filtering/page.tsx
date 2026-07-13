import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { FilterableDataTableDemo } from "@/components/site/data-table-demos"

const CODE = `<DataTable
  data={tasks}
  columns={columns}
  filterableColumns={[
    { id: "priority", label: "Priority", type: "select", options: PRIORITIES },
    { id: "status", label: "Status", type: "select", options: STATUSES },
    { id: "budget", label: "Budget", type: "number" },
  ]}
  // ...
/>
// types: "text" | "number" | "select" | "date"
// operators are readable: is / is not / contains / does not contain /
// is any of / is none of / greater than / less than / between …
// Users build two-level AND/OR groups in the toolbar's Filters popover.
// Grouped Data Table takes the exact same filterableColumns/initialFilterState props.`

const PAGE_MARKDOWN = `# Filtering

AND/OR filter groups over Airtable-style readable operators, built into the
toolbar's Filters popover next to Columns. Works with: Data Table, Grouped
Data Table.

\`\`\`tsx
${CODE}
\`\`\`
`

export default function FilteringPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Filtering"
        actions={
          <CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/filtering" />
        }
        description="AND/OR filter groups over readable operators (is / is not / contains / greater than / between …), built into the toolbar's Filters popover."
      />

      <Section
        id="usage"
        title="Usage"
        description="Declare which columns are filterable and how — the type determines which operators are offered. Users build two-level AND/OR groups directly in the popover."
      >
        <WorksWith components={["data-table", "grouped-data-table"]} />
        <ComponentPreview
          preview={<FilterableDataTableDemo />}
          code={CODE}
        />
      </Section>
    </div>
  )
}
