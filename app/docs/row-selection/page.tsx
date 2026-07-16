import { ApiTable, apiRowsToMarkdown, type ApiRow } from "@/components/site/api-table"
import { CodeBlock } from "@/components/site/code-block"
import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { ToasterCallout, TOASTER_MARKDOWN } from "@/components/site/toaster-callout"
import { WorksWith } from "@/components/site/works-with"
import { RowSelectionDataTableDemo } from "@/components/site/data-table-demos"

const USAGE_CODE = `<DataTable<Task>
  data={rows}
  columns={columns}
  getRowId={(row) => row.id}
  enableRowSelection
  actions={[
    { id: "archive", label: "Archive", icon: Archive, onClick: ({ rows }) => archive(rows) },
    { id: "delete", label: "Delete", icon: Trash2, variant: "destructive", onClick: ({ rows }) => remove(rows) },
  ]}
/>`

const SERVER_CODE = `// With server-driven pagination, the select-all header gains a third state:
// none → all loaded → ALL MATCHING (rows not yet loaded included). Your
// actions receive the loaded rows; treat isAllMatchingSelected server-side.
<DataTable
  data={loadedPage}
  columns={columns}
  getRowId={(row) => row.id}
  enableRowSelection
  manualPagination
  totalRowCount={8412}
/>`

const API_ROWS: ApiRow[] = [
  {
    name: "enableRowSelection?",
    type: "boolean",
    defaultValue: "false",
    description:
      "Adds the row-number/checkbox gutter column with tri-state select-all and Sheets/Gmail-style shift-click range select.",
  },
  {
    name: "actions?",
    type: "DataTableAction[]",
    description:
      "Bulk actions shown in the Actions dropdown next to Columns. The trigger is disabled while nothing is selected.",
  },
  {
    name: "DataTableAction.onClick",
    type: "({ rowIds, rows, allMatching }) => void",
    description:
      "Receives the selected rows; the popover closes after the click. allMatching is true when the select-all cycle reached \"all matching rows\" under manual pagination — rows then covers only the loaded subset, so run a server-side bulk path for the full scope.",
  },
  {
    name: "DataTableAction.icon?",
    type: "ComponentType",
    description: "Optional leading icon (any lucide icon works).",
  },
  {
    name: "DataTableAction.variant?",
    type: '"default" | "destructive"',
    defaultValue: '"default"',
    description: "Destructive actions render in the destructive color.",
  },
  {
    name: "DataTableAction.disabled?",
    type: "boolean",
    defaultValue: "false",
    description: "Disables one action row without hiding it.",
  },
  {
    name: "getRowId?",
    type: "(row, index) => string",
    defaultValue: "index",
    description:
      "Stable row identity — required for selection to survive sorting and filtering.",
  },
]

const PAGE_MARKDOWN = `# Row Selection & Actions

enableRowSelection adds a checkbox gutter with a tri-state select-all header
(none → all loaded → all matching, when totalRowCount exceeds what's loaded)
and Sheets/Gmail-style shift-click range select. Selected rows scope Footer &
Aggregation, become the target of Delete/Backspace bulk-clear, and are passed
to every action in the actions dropdown via onClick({ rowIds, rows, allMatching }).
allMatching flags a logical "all matching rows" selection that exceeds the
loaded subset (manual pagination) — handle it with a server-side bulk path.
Works with: Data Table.

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
${SERVER_CODE}
\`\`\`

## API Reference
${apiRowsToMarkdown(API_ROWS)}
`

export default function RowSelectionPage() {
  return (
    <div className="space-y-16">
      <PageHeader
        title="Row Selection & Actions"
        actions={
          <CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/row-selection" />
        }
        description="A checkbox gutter with a tri-state select-all header, shift-click range select, and a configurable bulk-actions dropdown."
      />

      <Section
        id="installation"
        title="Installation"
        description="Row selection ships with Data Table — no separate install."
      >
        <WorksWith components={["data-table"]} />
        <InstallTabs package="@kotsas-ui/data-table" />
        <ToasterCallout />
      </Section>

      <Section
        id="usage"
        title="Usage"
        description="Select rows (try shift-click for a range), then open Actions — each action receives the selection via onClick({ rowIds, rows, allMatching }). Selected rows also scope footer aggregation and Delete/Backspace bulk-clear."
      >
        <ComponentPreview preview={<RowSelectionDataTableDemo />} code={USAGE_CODE} />
      </Section>

      <Section
        id="examples"
        title="Examples"
        description="With server-driven pagination, the select-all header cycles to a third state — every row matching the current filter, loaded or not:"
      >
        <CodeBlock code={SERVER_CODE} />
      </Section>

      <Section id="api" title="API Reference">
        <ApiTable rows={API_ROWS} />
      </Section>
    </div>
  )
}
