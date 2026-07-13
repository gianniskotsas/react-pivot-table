import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { BasicDataTableDemo } from "@/components/site/data-table-demos"
import { AccountsTable } from "@/app/(examples)/accounts/accounts-table"
import { accounts } from "@/app/(examples)/accounts/data"

const SORT_CODE = `// Every col.* method is sortable by default — click a header to sort.
col.text("title")
col.currency("budget")

// Opt a column out explicitly:
col.text("id", { enableSorting: false })`

const FILTER_CODE = `<GroupedDataTable
  data={accounts}
  columns={columns}
  filterableColumns={[
    { id: "entity", label: "Entity", type: "select", options },
    { id: "bank", label: "Bank", type: "select", options },
    { id: "balance", label: "Balance", type: "number" },
  ]}
  // ...
/>
// types: "text" | "number" | "select" | "date"
// operators are readable: is / is not / contains / does not contain /
// is any of / is none of / greater than / less than / between …
// Users build two-level AND/OR groups in the toolbar's Filters popover.`

const PAGE_MARKDOWN = `# Sorting & Filtering

## Sorting
Click a column header to cycle asc/desc/none. Every defineColumns field is
sortable by default. Works with: Data Table.

\`\`\`tsx
${SORT_CODE}
\`\`\`

## Filtering
AND/OR filter groups over Airtable-style readable operators. Works with:
Grouped Data Table.

\`\`\`tsx
${FILTER_CODE}
\`\`\`
`

export default function SortingFilteringPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Sorting & Filtering"
        actions={
          <CopyPageMenu
            markdown={PAGE_MARKDOWN}
            url="/docs/sorting-filtering"
          />
        }
        description="Two independent mechanisms today, documented together since they're the two ways users narrow down what they're looking at."
      />

      <Section
        id="sorting"
        title="Sorting"
        description="Click a column header to cycle ascending / descending / none. Every field built with defineColumns is sortable by default."
      >
        <WorksWith components={["data-table"]} />
        <ComponentPreview preview={<BasicDataTableDemo />} code={SORT_CODE} />
      </Section>

      <Section
        id="filtering"
        title="Filtering"
        description="AND/OR filter groups over readable operators (is / is not / contains / greater than / between …), built in the toolbar's Filters popover."
      >
        <WorksWith components={["grouped-data-table"]} />
        <ComponentPreview
          align="start"
          preview={<AccountsTable data={accounts} />}
          code={FILTER_CODE}
        />
      </Section>
    </div>
  )
}
