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
  "npx shadcn@latest add https://ui.kotsas.com/r/table-fields.json"

const NAMESPACE_CMD = "npx shadcn@latest add @kotsas-ui/table-fields"

const USAGE = `import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table"
import { defineColumns } from "@/components/data-table"

type Employee = { id: string; name: string; email: string; salary: number; active: boolean }

const col = defineColumns<Employee>()

const columns = [
  col.text("name"),
  col.email("email"),
  col.currency("salary", { currency: "USD" }),
  col.checkbox("active"),
]

function EmployeeTable({ data }: { data: Employee[] }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })
  // ...render table.getRowModel().rows with flexRender, same as any TanStack table
}`

const FIELDS: {
  method: string
  value: string
  desc: string
  options?: string
}[] = [
  { method: "text(key)", value: "string", desc: "Single-line text." },
  { method: "longText(key)", value: "string", desc: "Multi-line text." },
  { method: "url(key)", value: "string", desc: "Renders as a clickable link." },
  { method: "email(key)", value: "string", desc: "Renders as a mailto: link." },
  {
    method: "phone(key)",
    value: "string",
    desc: "Renders as a tel: link, formatted via libphonenumber-js.",
  },
  {
    method: "number(key, opts?)",
    value: "number",
    desc: "Intl-formatted number.",
    options: "locale?, maximumFractionDigits?",
  },
  {
    method: "currency(key, opts?)",
    value: "number",
    desc: "Intl currency formatting.",
    options: "currency? (default USD), locale?",
  },
  {
    method: "percent(key, opts?)",
    value: "number",
    desc: "Renders a fraction (0.42) as a percentage (42%).",
    options: "locale?, maximumFractionDigits?",
  },
  {
    method: "duration(key, opts?)",
    value: "number",
    desc: 'Renders a duration in seconds/ms as e.g. "1h 20m".',
    options: 'unit? ("s" | "ms"), maxUnits?',
  },
  {
    method: "singleSelect(key, opts)",
    value: "string",
    desc: "One value from a fixed option list, rendered as a colored chip.",
    options: "options (required)",
  },
  {
    method: "multiSelect(key, opts)",
    value: "string[]",
    desc: "Multiple values from a fixed option list, rendered as chips.",
    options: "options (required)",
  },
  { method: "checkbox(key)", value: "boolean", desc: "A checkbox cell." },
  {
    method: "rating(key, opts?)",
    value: "number",
    desc: "A star rating.",
    options: "max? (default 5)",
  },
  {
    method: "date(key, opts?)",
    value: "Date | string",
    desc: "A formatted date, optionally with time.",
    options: "withTime?, locale?",
  },
  {
    method: "button(id, opts)",
    value: "—",
    desc: "An action column (no data accessor) that renders a button and calls onClick(row).",
    options: "label (required), onClick (required)",
  },
]

const OPTIONS_COMMON = `col.text("name", {
  header: "Full name",   // overrides the auto-generated label
  editable: false,       // per-column override of the table default
  enableSorting: true,   // default true
  enableHiding: true,    // default true
  enablePinning: true,   // default true
  enableResizing: true,  // default true
  size: 200,              // fixed width in px
})`

export default function TableFieldsDocsPage() {
  return (
    <div className="max-w-3xl space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Table Fields</h1>
        <p className="text-muted-foreground">
          Standalone, type-safe Airtable-style field types for any shadcn +
          TanStack Table — number, currency, percent, duration, text, url,
          email, phone, single/multi select, checkbox, rating, button, and date.
          Display renderers, Intl formatters, header icons, and clipboard/CSV
          serialization, all built in.
        </p>
        <p className="text-sm text-muted-foreground">
          Used directly on a plain TanStack table for display-only grids, or as
          the field catalogue underneath{" "}
          <Link
            href="/docs/data-table"
            className="underline underline-offset-4"
          >
            Data Table
          </Link>{" "}
          for a fully editable grid.{" "}
          <Link href="/fields" className="underline underline-offset-4">
            See every field type live →
          </Link>
        </p>
      </header>

      {/* Installation */}
      <section id="installation" className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Installation</h2>
        <p className="text-sm text-muted-foreground">
          A single build works for both Base UI and Radix shadcn projects —
          Table Fields renders plain HTML/shadcn primitives with no
          base-ui/Radix-specific imports of its own.
        </p>
        <CodeBlock code={INSTALL_URL} />
        <p className="text-sm text-muted-foreground">…or by namespace:</p>
        <CodeBlock code={NAMESPACE_CMD} />
        <p className="text-sm text-muted-foreground">
          Installs into{" "}
          <code className="font-mono">components/table-fields/</code>, the npm
          deps (<code className="font-mono">@tanstack/react-table</code>,{" "}
          <code className="font-mono">lucide-react</code>,{" "}
          <code className="font-mono">libphonenumber-js</code>), and the shadcn
          primitives it needs (badge, button, checkbox, input).
        </p>
      </section>

      {/* Usage */}
      <section id="usage" className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Usage</h2>
        <p className="text-sm text-muted-foreground">
          The typical entry point is{" "}
          <code className="font-mono">defineColumns</code> (installed as part of{" "}
          <Link
            href="/docs/data-table"
            className="underline underline-offset-4"
          >
            Data Table
          </Link>
          ), which returns a typed <code className="font-mono">col</code>{" "}
          builder closed over your row type — each method only accepts a key
          whose value type matches the field (e.g.{" "}
          <code className="font-mono">col.number</code> rejects a{" "}
          <code className="font-mono">string</code> key at compile time). The
          resulting columns are ordinary{" "}
          <code className="font-mono">ColumnDef</code>s, so they drop into any
          TanStack table — not just <code className="font-mono">DataTable</code>
          .
        </p>
        <CodeBlock filename="employee-table.tsx" code={USAGE} />
      </section>

      {/* Field catalogue */}
      <section id="fields" className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Field catalogue
        </h2>
        <p className="text-sm text-muted-foreground">
          Every <code className="font-mono">col.*</code>
          {
            " method. The first argument is always a key of your row type (type-checked against the "
          }
          &quot;Value type&quot; column); the last is an options object — see
          &quot;Common options&quot; below for the ones every field shares.
        </p>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-52">Method</TableHead>
                <TableHead className="w-32">Value type</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FIELDS.map((f) => (
                <TableRow key={f.method}>
                  <TableCell className="font-mono text-xs">
                    {f.method}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {f.value}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {f.desc}
                    {f.options ? (
                      <span className="mt-0.5 block font-mono text-xs">
                        {f.options}
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Common options */}
      <section id="common-options" className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Common options</h2>
        <p className="text-sm text-muted-foreground">
          Every field method accepts these, in addition to its own type-specific
          options:
        </p>
        <CodeBlock code={OPTIONS_COMMON} />
      </section>

      {/* Standalone display */}
      <section id="standalone" className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Display-only usage
        </h2>
        <p className="text-sm text-muted-foreground">
          Every field&apos;s underlying{" "}
          <code className="font-mono">FieldType</code> is exported directly too
          (<code className="font-mono">numberField</code>,{" "}
          <code className="font-mono">textField</code>,{" "}
          <code className="font-mono">singleSelectField</code>, …), each with a{" "}
          <code className="font-mono">display</code> renderer usable as a plain
          ColumnDef <code className="font-mono">cell</code> — no editing, no{" "}
          <code className="font-mono">DataTable</code> runtime required.
          Convenience <code className="font-mono">*Cell</code> functions (
          <code className="font-mono">currencyCell</code>,{" "}
          <code className="font-mono">dateCell</code>, …) wrap that pattern for
          one-line use inside a raw <code className="font-mono">ColumnDef</code>
          .
        </p>
      </section>
    </div>
  )
}
