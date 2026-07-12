import { TriangleAlert } from "lucide-react"
import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CodeBlock } from "@/components/site/code-block"

const INSTALL_URL =
  "npx shadcn@latest add https://ui.kotsas.com/r/data-table.json"
const INSTALL_RADIX_URL =
  "npx shadcn@latest add https://ui.kotsas.com/r/data-table-radix.json"
const NAMESPACE_CMD = "npx shadcn@latest add @kotsas-ui/data-table"
const NAMESPACE_RADIX_CMD = "npx shadcn@latest add @kotsas-ui/data-table-radix"

const USAGE = `import { DataTable, defineColumns } from "@/components/data-table"

type Task = { id: string; title: string; priority: string; hoursLogged: number; done: boolean }

const col = defineColumns<Task>()

const columns = [
  col.text("title"),
  col.singleSelect("priority", {
    options: [
      { label: "Low", value: "low" },
      { label: "High", value: "high" },
    ],
  }),
  col.number("hoursLogged"),
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
      enableRowSelection
      calculableColumns={[{ columnId: "hoursLogged", default: "sum" }]}
    />
  )
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

export default function DataTableDocsPage() {
  return (
    <div className="max-w-3xl space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Data Table</h1>
        <p className="text-muted-foreground">
          A fully editable spreadsheet-style grid: keyboard navigation, row
          selection, footer aggregation, undo/redo, copy/paste, and CSV export —
          built on TanStack Table and{" "}
          <Link
            href="/docs/table-fields"
            className="underline underline-offset-4"
          >
            Table Fields
          </Link>
          .{" "}
          <Link
            href="/data-table-demo"
            className="underline underline-offset-4"
          >
            See it live →
          </Link>
        </p>
      </header>

      {/* Installation */}
      <section id="installation" className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Installation</h2>

        <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              Two builds — match your project.
            </span>{" "}
            <code className="font-mono text-foreground">data-table</code> is for{" "}
            <span className="text-foreground">Base UI</span> shadcn projects;{" "}
            <code className="font-mono text-foreground">data-table-radix</code>{" "}
            (below) is for <span className="text-foreground">Radix UI</span>{" "}
            projects — same component and API. Check the{" "}
            <code className="font-mono text-foreground">base</code> in your{" "}
            <code className="font-mono text-foreground">components.json</code>{" "}
            if you&apos;re not sure which you have.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Add it from the hosted registry:
        </p>
        <CodeBlock code={INSTALL_URL} />
        <p className="text-sm text-muted-foreground">…or by namespace:</p>
        <CodeBlock code={NAMESPACE_CMD} />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Radix projects:</span>{" "}
          install the Radix build instead:
        </p>
        <CodeBlock code={INSTALL_RADIX_URL} />
        <CodeBlock code={NAMESPACE_RADIX_CMD} />
        <p className="text-sm text-muted-foreground">
          Either build installs into{" "}
          <code className="font-mono">components/data-table/</code>, pulls in{" "}
          <Link
            href="/docs/table-fields"
            className="underline underline-offset-4"
          >
            table-fields
          </Link>{" "}
          as a registry dependency, the npm deps (
          <code className="font-mono">@tanstack/react-table</code>,{" "}
          <code className="font-mono">lucide-react</code>,{" "}
          <code className="font-mono">sonner</code>), and the shadcn primitives
          it needs (table, button, checkbox, popover, input).{" "}
          <code className="font-mono">sonner</code>&apos;s{" "}
          <code className="font-mono">{"<Toaster />"}</code> must be mounted
          once in your app for the undo/redo/paste/clear/export confirmation
          toasts to appear.
        </p>
      </section>

      {/* Usage */}
      <section id="usage" className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Usage</h2>
        <p className="text-sm text-muted-foreground">
          <code className="font-mono">DataTable</code> owns no server state — it
          reports every edit via <code className="font-mono">onUpdateData</code>
          , and you decide how to apply it (local state, an optimistic mutation,
          whatever fits).
        </p>
        <CodeBlock filename="task-grid.tsx" code={USAGE} />
      </section>

      {/* Props */}
      <section id="props" className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Props</h2>
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
      </section>

      {/* Selection & footer aggregation */}
      <section id="selection" className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Row selection &amp; footer aggregation
        </h2>
        <p className="text-sm text-muted-foreground">
          <code className="font-mono">enableRowSelection</code> adds a checkbox
          gutter with a tri-state select-all header (none → all loaded → all
          matching, when <code className="font-mono">totalRowCount</code>{" "}
          exceeds what&apos;s loaded) and Sheets/Gmail-style shift-click range
          select. Columns listed in{" "}
          <code className="font-mono">calculableColumns</code> get a footer cell
          with a method picker (sum/avg/min/max/count); the aggregation
          automatically scopes to the current row selection when one exists,
          falling back to every visible row otherwise. For{" "}
          <code className="font-mono">manualPagination</code>
          {" tables, a scope that extends beyond the loaded rows shows a "}
          &quot;Calculate&quot; trigger that calls your{" "}
          <code className="font-mono">computeAggregate</code> callback rather
          than silently summing only what happens to be loaded.
        </p>
      </section>

      {/* Undo/redo + clipboard */}
      <section id="undo-clipboard" className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Undo/redo, copy/paste &amp; CSV export
        </h2>
        <p className="text-sm text-muted-foreground">
          Every edit — typing, a paste, or a bulk-clear — pushes one undo step,
          so a multi-cell paste or a selection-wide clear undoes as a single{" "}
          <code className="font-mono">Ctrl/Cmd+Z</code>, not one step per cell.
          Copy and paste move tab-separated values, compatible with
          Excel/Sheets: paste a block from either and it lands starting at the
          active cell, skipping any non-editable columns it crosses. A block
          pasted past the last row is reported through{" "}
          <code className="font-mono">onCreateRows</code>
          {" instead of being silently dropped. "}
          The toolbar&apos;s <span className="font-medium">
            Export CSV
          </span>{" "}
          button exports the current sorted/filtered/visible view (RFC 4180,
          with formula-injection–neutralizing for fields starting with{" "}
          <code className="font-mono">=</code>,{" "}
          <code className="font-mono">+</code>,{" "}
          <code className="font-mono">-</code>, or{" "}
          <code className="font-mono">@</code>).
        </p>
        <p className="text-sm text-muted-foreground">
          Copy/paste serialization is per-column, populated automatically by{" "}
          <code className="font-mono">defineColumns</code>
          {" from each field's own "}
          <code className="font-mono">toClipboard</code>/
          <code className="font-mono">fromClipboard</code>. A raw{" "}
          <code className="font-mono">ColumnDef</code> can opt in the same way
          via <code className="font-mono">meta</code>:
        </p>
        <CodeBlock code={CLIPBOARD_META} />
      </section>

      {/* Keyboard shortcuts */}
      <section id="shortcuts" className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Keyboard shortcuts
        </h2>
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
      </section>
    </div>
  )
}
