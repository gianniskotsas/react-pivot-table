import { ApiTable, apiRowsToMarkdown, type ApiRow } from "@/components/site/api-table"
import { CodeBlock } from "@/components/site/code-block"
import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { FilterableDataTableDemo } from "@/components/site/data-table-demos"

const USAGE_CODE = `<DataTable
  data={tasks}
  columns={columns}
  filterableColumns={[
    { id: "priority", label: "Priority", type: "select", options: PRIORITIES },
    { id: "status", label: "Status", type: "select", options: STATUSES },
    { id: "budget", label: "Budget", type: "number" },
  ]}
/>
// types: "text" | "number" | "select" | "date"
// operators are readable: is / is not / contains / does not contain /
// is any of / is none of / greater than / less than / between …
// Grouped Data Table takes the exact same filterableColumns/initialFilterState props.`

const INITIAL_STATE_CODE = `// Arrive pre-filtered — e.g. a "High priority" saved view.
<DataTable
  data={tasks}
  columns={columns}
  filterableColumns={filterableColumns}
  initialFilterState={{
    combinator: "and",
    groups: [
      {
        id: "g1",
        combinator: "and",
        conditions: [
          { id: "c1", columnId: "priority", operator: "isAnyOf", value: ["high", "urgent"] },
        ],
      },
    ],
  }}
/>`

const API_ROWS: ApiRow[] = [
  {
    name: "filterableColumns?",
    type: "FilterDef[]",
    description:
      "Which columns are filterable and how. Adds the toolbar's Filters popover when non-empty. Each id must match a column id AND a row property key.",
  },
  {
    name: "initialFilterState?",
    type: "FilterState",
    description:
      "AND/OR filter groups applied once at mount — conditions on unknown columns are stripped automatically.",
  },
  {
    name: "FilterDef.type",
    type: '"text" | "number" | "select" | "date"',
    description:
      "Decides which operators are offered: contains/starts-with for text, between/greater-than for numbers, is-any-of for selects, before/after/between for dates.",
  },
  {
    name: "FilterDef.operators?",
    type: "FilterOperator[]",
    defaultValue: "per type",
    description: "Restricts the operator list; falls back to the type's full default set.",
  },
  {
    name: "FilterDef.options?",
    type: "{ label; value }[]",
    description: 'Required for type "select" — the choosable values.',
  },
]

const PAGE_MARKDOWN = `# Filtering

AND/OR filter groups over Airtable-style readable operators, built into the
toolbar's Filters popover next to Columns. Works with: Data Table, Grouped
Data Table.

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
${INITIAL_STATE_CODE}
\`\`\`

## API Reference
${apiRowsToMarkdown(API_ROWS)}
`

export default function FilteringPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Filtering"
        actions={<CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/filtering" />}
        description="AND/OR filter groups over readable operators (is / is not / contains / greater than / between …), built into the toolbar's Filters popover."
      />

      <Section
        id="installation"
        title="Installation"
        description="Filtering ships with both table components — install whichever you're using."
      >
        <WorksWith components={["data-table", "grouped-data-table"]} />
        <InstallTabs package="@kotsas-ui/data-table" />
      </Section>

      <Section
        id="usage"
        title="Usage"
        description="Declare which columns are filterable and how — the type determines which operators are offered. Users build two-level AND/OR groups directly in the popover."
      >
        <ComponentPreview preview={<FilterableDataTableDemo />} code={USAGE_CODE} />
      </Section>

      <Section
        id="examples"
        title="Examples"
        description="Pass initialFilterState to arrive pre-filtered — e.g. a saved view. Users can still edit or clear it from the popover."
      >
        <CodeBlock code={INITIAL_STATE_CODE} />
      </Section>

      <Section id="api" title="API Reference">
        <ApiTable rows={API_ROWS} />
      </Section>
    </div>
  )
}
