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
  actions={[
    { id: "archive", label: "Archive", icon: Archive, onClick: ({ rows }) => archive(rows) },
    { id: "delete", label: "Delete", icon: Trash2, variant: "destructive", onClick: ({ rows }) => remove(rows) },
  ]}
/>`

const PAGE_MARKDOWN = `# Row Selection & Actions

enableRowSelection adds a checkbox gutter with a tri-state select-all
header (none → all loaded → all matching, when totalRowCount exceeds what's
loaded) and Sheets/Gmail-style shift-click range select. Selected rows scope
Footer & Aggregation, become the target of Delete/Backspace bulk-clear, and
are passed to every action in the \`actions\` dropdown (Columns → Filters →
Actions in the toolbar) via \`onClick({ rowIds, rows })\`. Works with: Data
Table.

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
            </Link>
            , become the target of Delete/Backspace bulk-clear (see{" "}
            <Link
              href="/docs/copy-paste-undo"
              className="underline underline-offset-4"
            >
              Copy/Paste &amp; Undo
            </Link>
            {
              "), and are passed to the developer-configured Actions dropdown — shown in the toolbar next to Columns and Filters, with a chevron-down trigger — via each action's "
            }
            <code className="font-mono">onClick({"{ rowIds, rows }"})</code>.
          </>
        }
      >
        <WorksWith components={["data-table"]} />
        <ComponentPreview preview={<SelectionDataTableDemo />} code={CODE} />
      </Section>
    </div>
  )
}
