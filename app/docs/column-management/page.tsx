import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { ColumnManagementDataTableDemo } from "@/components/site/data-table-demos"

const CODE = `col.text("title", {
  enableHiding: true,   // default true — can be toggled in the Columns menu
  enablePinning: true,  // default true — can be pinned left/right
  size: 200,             // fixed width in px
})`

const PAGE_MARKDOWN = `# Column Management

The toolbar's Columns menu toggles per-column visibility and pins columns
left or right (frozen while the rest of the table scrolls horizontally).
Works with: Data Table.

\`\`\`tsx
${CODE}
\`\`\`
`

export default function ColumnManagementPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Column Management"
        actions={
          <CopyPageMenu
            markdown={PAGE_MARKDOWN}
            url="/docs/column-management"
          />
        }
        description="Show or hide columns, and pin them left or right so they stay visible while the rest of the table scrolls horizontally."
      />

      <Section
        id="usage"
        title="Usage"
        description="Open the Columns menu in the toolbar to toggle visibility or pin a column. Both are opt-in per column via defineColumns."
      >
        <WorksWith components={["data-table"]} />
        <ComponentPreview
          preview={<ColumnManagementDataTableDemo />}
          code={CODE}
        />
      </Section>
    </div>
  )
}
