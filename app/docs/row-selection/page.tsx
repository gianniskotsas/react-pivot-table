import Link from "next/link"

import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { SelectionDataTableDemo } from "@/components/site/data-table-demos"

const CODE = `<DataTable<Task>
  data={rows}
  columns={columns}
  getRowId={(row) => row.id}
  enableRowSelection
/>`

const PAGE_MARKDOWN = `# Row Selection & Actions

enableRowSelection adds a checkbox gutter with a tri-state select-all
header (none → all loaded → all matching, when totalRowCount exceeds what's
loaded) and Sheets/Gmail-style shift-click range select. Selected rows scope
Footer & Aggregation and become the target of Delete/Backspace bulk-clear.
Works with: Data Table.

\`\`\`tsx
${CODE}
\`\`\`
`

export default function RowSelectionPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Row Selection & Actions"
        actions={
          <CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/row-selection" />
        }
        description="A checkbox gutter with a tri-state select-all header and Sheets/Gmail-style shift-click range select."
      />

      <Section
        id="usage"
        title="Usage"
        description={
          <>
            <code className="font-mono">enableRowSelection</code> adds the
            gutter column. Selected rows scope{" "}
            <Link
              href="/docs/footer-aggregation"
              className="underline underline-offset-4"
            >
              footer aggregation
            </Link>{" "}
            and become the target of Delete/Backspace bulk-clear (see{" "}
            <Link
              href="/docs/copy-paste-undo"
              className="underline underline-offset-4"
            >
              Copy/Paste &amp; Undo
            </Link>
            ).
          </>
        }
      >
        <WorksWith components={["data-table"]} />
        <ComponentPreview preview={<SelectionDataTableDemo />} code={CODE} />
      </Section>
    </div>
  )
}
