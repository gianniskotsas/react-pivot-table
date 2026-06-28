import { TriangleAlert } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CodeBlock } from "@/components/site/code-block"
import { SiteHeader } from "@/components/site/site-header"

const INSTALL_URL =
  "npx shadcn@latest add https://ui.kotsas.com/r/grouped-data-table.json"

const INSTALL_RAW =
  "npx shadcn@latest add https://raw.githubusercontent.com/gianniskotsas/react-pivot-table/main/public/r/grouped-data-table.json"

const NAMESPACE = `// components.json
{
  "registries": {
    "@kotsas-ui": "https://ui.kotsas.com/r/{name}.json"
  }
}`

const NAMESPACE_CMD = "npx shadcn@latest add @kotsas-ui/grouped-data-table"

const INSTALL_RADIX_URL =
  "npx shadcn@latest add https://ui.kotsas.com/r/grouped-data-table-radix.json"

const NAMESPACE_RADIX_CMD = "npx shadcn@latest add @kotsas-ui/grouped-data-table-radix"

const USAGE = `import { GroupedDataTable } from "@/components/grouped-data-table"
import type { ColumnDef } from "@tanstack/react-table"

type Account = { id: string; entity: string; bank: string; balance: number }

const columns: ColumnDef<Account, unknown>[] = [
  { id: "entity", accessorKey: "entity", header: "Entity", enableGrouping: true },
  { id: "bank", accessorKey: "bank", header: "Bank", enableGrouping: true },
  { id: "balance", accessorKey: "balance", header: "Balance", aggregationFn: "sum" },
]

export function Demo({ data }: { data: Account[] }) {
  return (
    <GroupedDataTable<Account>
      data={data}
      columns={columns}
      groupableDimensions={[
        { id: "entity", label: "Entity" },
        { id: "bank", label: "Bank" },
      ]}
      initialGrouping={["entity", "bank"]}
      groupColumn={{
        header: "Account",
        leaf: { primary: (row) => row.original.id },
      }}
    />
  )
}`

const LEAF = `groupColumn={{
  header: "Account",
  countMode: "leaf", // "leaf" (default) | "immediate"
  leaf: {
    primary: (row) => row.original.name,          // required
    icon: () => <Landmark className="size-4" />,  // optional
    secondary: (row) => row.original.iban,        // optional
  },
  // …or full control (takes precedence over leaf):
  // renderLeaf: (row) => <YourCell row={row} />,
}}`

const FILTERS = `filterableColumns={[
  { id: "bank", label: "Bank", type: "select", options },
  { id: "balance", label: "Balance", type: "number" },
  { id: "name", label: "Name", type: "text" },
]}
// types: "text" | "number" | "select" | "date"
// operators are readable: is / is not / contains / does not contain /
// is any of / is none of / greater than / less than / between …`

const PROPS: { name: string; type: string; desc: string }[] = [
  { name: "data", type: "TData[]", desc: "The rows to display." },
  { name: "columns", type: "ColumnDef<TData>[]", desc: "TanStack column defs for measure/attribute columns. Mark groupable ones with enableGrouping." },
  { name: "groupColumn", type: "GroupColumnConfig<TData>", desc: "The synthesized group column: header, leaf (primary/icon?/secondary?) or renderLeaf, and countMode." },
  { name: "groupableDimensions", type: "DimensionDef[]", desc: "Columns the user may group by (shown in the Group by picker)." },
  { name: "initialGrouping?", type: "string[]", desc: "Initial hierarchy order, e.g. [\"entity\", \"bank\"]. Applied at mount." },
  { name: "filterableColumns?", type: "FilterDef[]", desc: "Columns the user may filter, with type + operators." },
  { name: "initialFilterState?", type: "FilterState", desc: "Initial AND/OR filter groups." },
  { name: "enablePagination?", type: "boolean", desc: "Client-side pagination. Default true." },
]

export default function DocsPage() {
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-12 px-6 py-12 md:py-16">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
          <p className="text-muted-foreground">
            Grouped Data Table — an AG-Grid-style grouping / drill-down table for
            React, distributed as a shadcn registry component.
          </p>
        </header>

        {/* Installation */}
        <section id="installation" className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Installation</h2>

          <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Two builds — match your project.</span>{" "}
              <code className="font-mono text-foreground">grouped-data-table</code> is for{" "}
              <span className="text-foreground">Base UI</span> shadcn projects;{" "}
              <code className="font-mono text-foreground">grouped-data-table-radix</code> (below) is for{" "}
              <span className="text-foreground">Radix UI</span> projects — same component and API.
              Not sure which you have? Check the <code className="font-mono text-foreground">base</code>{" "}
              in your <code className="font-mono text-foreground">components.json</code> (Base UI is{" "}
              <code className="font-mono text-foreground">npx shadcn@latest init --base base-ui</code>).
            </p>
          </div>

          <p className="text-sm text-muted-foreground">Add it from the hosted registry:</p>
          <CodeBlock code={INSTALL_URL} />
          <p className="text-sm text-muted-foreground">…or from GitHub raw:</p>
          <CodeBlock code={INSTALL_RAW} />
          <p className="text-sm text-muted-foreground">
            Or register the <code className="font-mono">@kotsas-ui</code> namespace and
            install by alias:
          </p>
          <CodeBlock filename="components.json" code={NAMESPACE} />
          <CodeBlock code={NAMESPACE_CMD} />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Radix projects:</span> install the
            Radix build instead (by URL or namespace):
          </p>
          <CodeBlock code={INSTALL_RADIX_URL} />
          <CodeBlock code={NAMESPACE_RADIX_CMD} />
          <p className="text-sm text-muted-foreground">
            Either build installs the component into{" "}
            <code className="font-mono">components/grouped-data-table/</code>, the npm deps
            (<code className="font-mono">@tanstack/react-table</code>,{" "}
            <code className="font-mono">@dnd-kit/*</code>,{" "}
            <code className="font-mono">lucide-react</code>), and the shadcn primitives it
            needs (table, button, badge, checkbox, popover, select, input).
          </p>
        </section>

        {/* Usage */}
        <section id="usage" className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Usage</h2>
          <CodeBlock filename="demo.tsx" code={USAGE} />
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

        {/* Leaf */}
        <section id="group-column" className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Group column &amp; leaf</h2>
          <p className="text-sm text-muted-foreground">
            The left-most column renders the hierarchy. For leaf rows, use the declarative{" "}
            <code className="font-mono">leaf</code> (primary required; icon and secondary
            optional), or <code className="font-mono">renderLeaf</code> for full control.
          </p>
          <CodeBlock code={LEAF} />
        </section>

        {/* Filters */}
        <section id="filters" className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Filters</h2>
          <p className="text-sm text-muted-foreground">
            Declare which columns are filterable. Users build two-level AND/OR filter
            groups in the toolbar; the table re-filters and recomputes group counts and
            aggregations live.
          </p>
          <CodeBlock code={FILTERS} />
        </section>
      </main>
    </div>
  )
}
