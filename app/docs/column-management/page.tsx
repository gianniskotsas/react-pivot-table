import { ApiTable, apiRowsToMarkdown, type ApiRow } from "@/components/site/api-table"
import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import {
  ColumnManagementDataTableDemo,
  FreezeColumnsDataTableDemo,
} from "@/components/site/data-table-demos"

const USAGE_CODE = `col.text("title", {
  enableHiding: true,   // default true — can be toggled in the Columns menu
  enablePinning: true,  // default true — can be frozen left/right
})`

const FREEZE_CODE = `// Freeze the Name column from the start — it stays put while the
// other ~1300px of columns scroll horizontally behind it. Users can
// re-freeze or unfreeze any column from the Columns menu.
<DataTable
  data={employees}
  columns={columns}
  getRowId={(row) => row.id}
  initialColumnPinning={{ left: ["name"] }}
/>`

const API_ROWS: ApiRow[] = [
  {
    name: "enableHiding?",
    type: "boolean",
    defaultValue: "true",
    description:
      "Per-column option on every col.* method. When false, the column has no visibility checkbox in the Columns menu.",
  },
  {
    name: "enablePinning?",
    type: "boolean",
    defaultValue: "true",
    description:
      "Per-column option. When false, the column has no freeze-left/right buttons in the Columns menu.",
  },
  {
    name: "initialColumnPinning?",
    type: "{ left?: string[]; right?: string[] }",
    description:
      "DataTable prop — columns frozen from the start, by column id. Applied once at mount; users can still change it afterwards.",
  },
]

const PAGE_MARKDOWN = `# Column Management

The toolbar's Columns menu toggles per-column visibility and freezes columns
left or right — frozen columns stay put while the rest of the table scrolls
horizontally. Works with: Data Table.

## Installation
\`\`\`
npx shadcn@latest add @kotsas-ui/data-table
\`\`\`

## Usage
\`\`\`tsx
${USAGE_CODE}
\`\`\`

## Freeze columns
\`\`\`tsx
${FREEZE_CODE}
\`\`\`

## API Reference
${apiRowsToMarkdown(API_ROWS)}
`

export default function ColumnManagementPage() {
  return (
    <div className="space-y-16">
      <PageHeader
        title="Column Management"
        actions={
          <CopyPageMenu
            markdown={PAGE_MARKDOWN}
            url="/docs/column-management"
          />
        }
        description="Show or hide columns, and freeze them left or right so they stay visible while the rest of the table scrolls horizontally."
      />

      <Section
        id="installation"
        title="Installation"
        description="Column management ships with Data Table — no separate install."
      >
        <WorksWith components={["data-table"]} />
        <InstallTabs package="@kotsas-ui/data-table" />
      </Section>

      <Section
        id="usage"
        title="Usage"
        description="Open the Columns menu in the toolbar to toggle visibility or freeze a column. Both are on by default per column via defineColumns."
      >
        <ComponentPreview
          preview={<ColumnManagementDataTableDemo />}
          code={USAGE_CODE}
        />
      </Section>

      <Section
        id="freeze"
        title="Freeze columns"
        description="This table is ~1300px wide — scroll it horizontally and the frozen Name column holds its ground. Pass initialColumnPinning to freeze declaratively, or let users do it from the Columns menu."
      >
        <ComponentPreview
          align="start"
          preview={<FreezeColumnsDataTableDemo />}
          code={FREEZE_CODE}
        />
      </Section>

      <Section id="api" title="API Reference">
        <ApiTable rows={API_ROWS} />
      </Section>
    </div>
  )
}
