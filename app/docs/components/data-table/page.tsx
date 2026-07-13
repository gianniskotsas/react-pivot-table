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
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { SeeAlso } from "@/components/site/see-also"
import { BasicDataTableDemo } from "@/components/site/data-table-demos"

const USAGE = `import { DataTable, defineColumns } from "@/components/data-table"

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

const PAGE_MARKDOWN = `# Data Table

A fully editable spreadsheet-style grid, built on TanStack Table and Field Types.

## Installation
\`\`\`
npx shadcn@latest add @kotsas-ui/data-table
\`\`\`

## Usage
\`\`\`tsx
${USAGE}
\`\`\`

## Props
${PROPS.map((p) => `- \`${p.name}\` (${p.type}): ${p.desc}`).join("\n")}
`

export default function DataTableComponentPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Data Table"
        actions={
          <CopyPageMenu
            markdown={PAGE_MARKDOWN}
            url="/docs/components/data-table"
          />
        }
        description="A fully editable spreadsheet-style grid, built on TanStack Table and Field Types. See the feature pages for keyboard navigation, selection, footer, clipboard, and column behavior."
      />

      <Section
        id="installation"
        title="Installation"
        description={
          <>
            Two builds — <code className="font-mono">data-table</code> for Base
            UI shadcn projects,{" "}
            <code className="font-mono">data-table-radix</code> for Radix UI
            projects. Both mount <code className="font-mono">sonner</code>
            &apos;s <code className="font-mono">{"<Toaster />"}</code>
            {" for undo/redo/paste/clear/export confirmation toasts."}
          </>
        }
      >
        <InstallTabs package="@kotsas-ui/data-table" />
      </Section>

      <Section
        id="usage"
        title="Usage"
        description="DataTable owns no server state — it reports every edit via onUpdateData, and you decide how to apply it."
      >
        <ComponentPreview
          preview={<BasicDataTableDemo />}
          code={USAGE}
          filename="task-grid.tsx"
        />
      </Section>

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

      <Section id="see-also" title="See also">
        <SeeAlso
          links={[
            { href: "/docs/sorting-filtering", label: "Sorting & Filtering" },
            { href: "/docs/column-management", label: "Column Management" },
            { href: "/docs/row-selection", label: "Row Selection & Actions" },
            { href: "/docs/footer-aggregation", label: "Footer & Aggregation" },
            { href: "/docs/copy-paste-undo", label: "Copy/Paste & Undo" },
            { href: "/docs/field-types", label: "Field Types" },
          ]}
        />
      </Section>
    </div>
  )
}
