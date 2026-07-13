import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { CodeBlock } from "@/components/site/code-block"
import { BasicDataTableDemo } from "@/components/site/data-table-demos"

const CLIPBOARD_META = `col.currency("budget", { currency: "USD" })
// meta.toClipboard / meta.fromClipboard are populated automatically by
// defineColumns from the field's own serializers. A raw ColumnDef (the
// escape hatch, not built via col.*) can opt in the same way:
{
  id: "custom",
  meta: {
    label: "Custom",
    toClipboard: (v) => String(v ?? ""),
    fromClipboard: (text) => text, // return undefined to reject a pasted value
  },
}`

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: "Ctrl/Cmd+Z", desc: "Undo the last edit, paste, or bulk-clear." },
  { keys: "Ctrl/Cmd+Shift+Z", desc: "Redo." },
  {
    keys: "Ctrl/Cmd+C",
    desc: "Copy the active cell, or every visible column of every selected row, as TSV.",
  },
  {
    keys: "Ctrl/Cmd+V",
    desc: "Paste a TSV block starting at the active cell; rows past the last one are reported via onCreateRows.",
  },
  {
    keys: "Delete / Backspace",
    desc: "Clear every editable column of the selected rows, or just the active cell if nothing is selected.",
  },
]

const PAGE_MARKDOWN = `# Copy/Paste & Undo

Every edit — typing, a paste, or a bulk-clear — pushes one undo step, so a
multi-cell paste or a selection-wide clear undoes as a single Ctrl/Cmd+Z.
Copy and paste move tab-separated values, compatible with Excel/Sheets. A
block pasted past the last row is reported through onCreateRows instead of
being silently dropped. Works with: Data Table.

## Keyboard shortcuts
${SHORTCUTS.map((s) => `- \`${s.keys}\`: ${s.desc}`).join("\n")}

\`\`\`tsx
${CLIPBOARD_META}
\`\`\`
`

export default function CopyPasteUndoPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Copy/Paste & Undo"
        actions={
          <CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/copy-paste-undo" />
        }
        description="Excel/Sheets-compatible TSV copy/paste, a single undo/redo history across edits, and bulk-clear."
      />

      <Section
        id="usage"
        title="Usage"
        description={
          <>
            Try it in the demo: edit a cell, copy a selection (
            <code className="font-mono">Ctrl/Cmd+C</code>), paste a block (
            <code className="font-mono">Ctrl/Cmd+V</code>), then undo (
            <code className="font-mono">Ctrl/Cmd+Z</code>) — a multi-cell paste
            or a selection-wide clear undoes as a single step, not one step per
            cell. A block pasted past the last row is reported through{" "}
            <code className="font-mono">onCreateRows</code> instead of being
            silently dropped.
          </>
        }
      >
        <WorksWith components={["data-table"]} />
        <ComponentPreview
          preview={<BasicDataTableDemo />}
          code="<DataTable editable onUpdateData={...} onCreateRows={...} />"
        />
      </Section>

      <Section
        id="clipboard-serialization"
        title="Clipboard serialization"
        description={
          <>
            Copy/paste serialization is per-column, populated automatically by{" "}
            <code className="font-mono">defineColumns</code>
            {" from each field's own "}
            <code className="font-mono">toClipboard</code>/
            <code className="font-mono">fromClipboard</code>. A raw{" "}
            <code className="font-mono">ColumnDef</code> can opt in the same way
            via <code className="font-mono">meta</code>:
          </>
        }
      >
        <CodeBlock code={CLIPBOARD_META} />
      </Section>

      <Section id="shortcuts" title="Keyboard shortcuts">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-52">Keys</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SHORTCUTS.map((s) => (
                <TableRow key={s.keys}>
                  <TableCell className="font-mono text-xs">{s.keys}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.desc}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section id="see-also" title="See also">
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Downloading the current view as a file is a separate feature — see{" "}
          <Link href="/docs/export" className="underline underline-offset-4">
            Export Data
          </Link>
          .
        </div>
      </Section>
    </div>
  )
}
