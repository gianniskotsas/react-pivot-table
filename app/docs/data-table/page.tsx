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
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { CodeBlock } from "@/components/site/code-block"
import {
  BasicDataTableDemo,
  SelectionDataTableDemo,
} from "@/components/site/data-table-demos"

const BASIC_USAGE = `import { DataTable, defineColumns } from "@/components/data-table"

type Task = { id: string; title: string; priority: string; status: string; budget: number; done: boolean }

const col = defineColumns<Task>()

const columns = [
  col.text("title"),
  col.singleSelect("priority", { options: [...] }),
  col.singleSelect("status", { options: [...] }),
  col.currency("budget"),
  col.checkbox("done", { header: "Done" }),
]

export function TaskGrid({ data }: { data: Task[] }) {
  const [rows, setRows] = React.useState(data)

  return (
    <DataTable<Task>
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      editable
      onUpdateData={(rowId, columnId, value) =>
        setRows((prev) =>
          prev.map((r) => (r.id === rowId ? { ...r, [columnId]: value } : r)),
        )
      }
    />
  )
}`

const SELECTION_USAGE = `<DataTable<Task>
  data={rows}
  columns={columns}
  getRowId={(row) => row.id}
  editable
  onUpdateData={handleUpdateData}
  enableRowSelection
  calculableColumns={[
    { columnId: "hours", default: "sum" },
    { columnId: "budget", methods: ["sum", "avg"], default: "sum" },
  ]}
/>`

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

const PROPS: { name: string; type: string; desc: string }[] = [
  { name: "data", type: "TData[]", desc: "The rows to display." },
  {
    name: "columns",
    type: "ColumnDef<TData, unknown>[]",
    desc: "Usually built with defineColumns<TData>()'s col.* methods; plain TanStack ColumnDefs also work.",
  },
  {
    name: "getRowId?",
    type: "(row, index) => string",
    desc: "Stable row identity — required for selection/undo/paste to survive sorting. Defaults to the row's array index.",
  },
  {
    name: "editable?",
    type: "boolean",
    desc: "Table-level default for whether cells can be edited; per-column editable in defineColumns overrides it.",
  },
  {
    name: "onUpdateData?",
    type: "(rowId, columnId, value) => void",
    desc: "Called for every committed edit (typing + Enter, paste, bulk-clear, undo, redo). The library never mutates data itself — you own applying the change.",
  },
  {
    name: "onCreateRows?",
    type: "(partialRows: Partial<TData>[]) => void",
    desc: "Called when a paste extends past the last row, once per overflow row, with only the pasted columns populated.",
  },
  {
    name: "enablePagination?",
    type: "boolean",
    desc: "Client-side pagination, 50 rows/page. Default true.",
  },
  {
    name: "enableRowSelection?",
    type: "boolean",
    desc: "Adds the row-number/checkbox gutter column with tri-state select-all and shift-click range select. Default false.",
  },
  {
    name: "manualPagination?",
    type: "boolean",
    desc: "True when pagination is server-driven — data holds only the loaded page, not the full dataset. Default false.",
  },
  {
    name: "totalRowCount?",
    type: "number",
    desc: "Total row count across all pages/filters when manualPagination is true — powers the select-all-matching and footer scope UI.",
  },
  {
    name: "calculableColumns?",
    type: "CalculableColumn[]",
    desc: "{ columnId, methods?: AggregationMethod[], default?: AggregationMethod | null }[] — which columns get a footer aggregation picker (sum/avg/min/max/count).",
  },
  {
    name: "computeAggregate?",
    type: "(args: ComputeAggregateArgs) => Promise<number>",
    desc: 'Server-side aggregate for scopes exceeding what\'s loaded (manualPagination), e.g. "sum of this column across all matching rows."',
  },
]

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: "Arrow keys", desc: "Move the active cell." },
  {
    keys: "Tab / Shift+Tab",
    desc: "Move right/left, wrapping to the next/previous row.",
  },
  { keys: "Enter", desc: "Begin editing the active cell (if editable)." },
  { keys: "Escape", desc: "Cancel an in-progress edit." },
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

export default function DataTableDocsPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Data Table"
        description={
          <>
            A fully editable spreadsheet-style grid: keyboard navigation, row
            selection, footer aggregation, undo/redo, copy/paste, and CSV export
            — built on TanStack Table and{" "}
            <Link
              href="/docs/table-fields"
              className="underline underline-offset-4"
            >
              Table Fields
            </Link>
            .
          </>
        }
      />

      {/* Installation */}
      <Section
        id="installation"
        title="Installation"
        description={
          <>
            Two builds — <code className="font-mono">data-table</code> for Base
            UI shadcn projects,{" "}
            <code className="font-mono">data-table-radix</code> for Radix UI
            projects. Both mount <code className="font-mono">sonner</code>
            &apos;s <code className="font-mono">{"<Toaster />"}</code> for
            undo/redo/paste/ clear/export confirmation toasts.
          </>
        }
      >
        <InstallTabs package="@kotsas-ui/data-table" />
      </Section>

      {/* Usage */}
      <Section
        id="usage"
        title="Usage"
        description="DataTable owns no server state — it reports every edit via onUpdateData, and you decide how to apply it."
      >
        <ComponentPreview
          preview={<BasicDataTableDemo />}
          code={BASIC_USAGE}
          filename="task-grid.tsx"
        />
      </Section>

      {/* Props */}
      <Section id="props" title="Props">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Prop</TableHead>
                <TableHead className="w-52">Type</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PROPS.map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="font-mono text-xs">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.type}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.desc}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      {/* Selection & footer aggregation */}
      <Section
        id="selection"
        title="Row selection & footer aggregation"
        description={
          <>
            <code className="font-mono">enableRowSelection</code> adds a
            checkbox gutter with a tri-state select-all header and
            Sheets/Gmail-style shift-click range select. Columns in{" "}
            <code className="font-mono">calculableColumns</code> get a footer
            method picker (sum/avg/min/max/count) that automatically scopes to
            the current row selection when one exists.
          </>
        }
      >
        <ComponentPreview
          preview={<SelectionDataTableDemo />}
          code={SELECTION_USAGE}
        />
      </Section>

      {/* Undo/redo + clipboard */}
      <Section
        id="undo-clipboard"
        title="Undo/redo, copy/paste & CSV export"
        description={
          <>
            Try it in the demos above: every edit — typing, a paste, or a
            bulk-clear — pushes one undo step, so a multi-cell paste or a
            selection-wide clear undoes as a single{" "}
            <code className="font-mono">Ctrl/Cmd+Z</code>. Copy and paste move
            tab-separated values, compatible with Excel/Sheets. A block pasted
            past the last row is reported through{" "}
            <code className="font-mono">onCreateRows</code> instead of being
            silently dropped. The toolbar&apos;s{" "}
            <span className="font-medium text-foreground">Export CSV</span>{" "}
            button exports the current sorted/filtered/visible view (RFC 4180,
            with formula-injection–neutralizing for fields starting with{" "}
            <code className="font-mono">=</code>,{" "}
            <code className="font-mono">+</code>,{" "}
            <code className="font-mono">-</code>, or{" "}
            <code className="font-mono">@</code>).
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Copy/paste serialization is per-column, populated automatically by{" "}
          <code className="font-mono">defineColumns</code> from each
          field&apos;s own <code className="font-mono">toClipboard</code>/
          <code className="font-mono">fromClipboard</code>. A raw{" "}
          <code className="font-mono">ColumnDef</code> can opt in the same way
          via <code className="font-mono">meta</code>:
        </p>
        <CodeBlock code={CLIPBOARD_META} />
      </Section>

      {/* Keyboard shortcuts */}
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
    </div>
  )
}
