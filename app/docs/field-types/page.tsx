import Link from "next/link"

import { ComponentPreview } from "@/components/site/component-preview"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { WorksWith } from "@/components/site/works-with"
import { CodeBlock } from "@/components/site/code-block"
import { FieldPreview } from "@/components/site/field-preview"
import {
  FIELD_DEMOS,
  type FieldDemoMeta,
} from "@/components/site/field-demos-data"

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

const OPTIONS_COMMON = `col.text("name", {
  header: "Full name",   // overrides the auto-generated label
  editable: false,       // per-column override of the table default
  enableSorting: true,   // default true
  enableHiding: true,    // default true
  enablePinning: true,   // default true
  enableResizing: true,  // default true
  size: 200,              // fixed width in px
})`

const CATEGORIES: FieldDemoMeta["category"][] = [
  "Text",
  "Numeric",
  "Choice",
  "Other",
]

const PAGE_MARKDOWN = `# Field Types

Fifteen type-safe, Airtable-style field types — display renderers, Intl
formatters, header icons, and clipboard/CSV serialization, all built in.
Works with: Data Table (via defineColumns); the raw display/*Cell functions
work standalone in any TanStack table, including Grouped Data Table.

## Installation

\`\`\`
npx shadcn@latest add @kotsas-ui/table-fields
\`\`\`

## Field catalogue

${CATEGORIES.map((category) =>
  FIELD_DEMOS.filter((f) => f.category === category)
    .map((f) => `- \`${f.code}\` (${f.valueType}): ${f.description}`)
    .join("\n")
).join("\n")}
`

export default function FieldTypesPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Field Types"
        actions={
          <CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/field-types" />
        }
        description="Fifteen type-safe, Airtable-style field types — display renderers, Intl formatters, header icons, and clipboard/CSV serialization, all built in."
      />

      <Section
        id="installation"
        title="Installation"
        description="A single build works for both Base UI and Radix shadcn projects — Table Fields renders plain HTML/shadcn primitives with no base-ui/Radix-specific imports of its own."
      >
        <InstallTabs package="@kotsas-ui/table-fields" />
      </Section>

      <Section
        id="usage"
        title="Usage"
        description={
          <>
            The typical entry point is{" "}
            <code className="font-mono">defineColumns</code> (installed as part
            of{" "}
            <Link
              href="/docs/components/data-table"
              className="underline underline-offset-4"
            >
              Data Table
            </Link>
            ), which returns a typed <code className="font-mono">col</code>{" "}
            builder closed over your row type — each method only accepts a key
            whose value type matches the field.
          </>
        }
      >
        <WorksWith components={["data-table", "grouped-data-table"]} />
        <CodeBlock code={USAGE} filename="employee-table.tsx" />
      </Section>

      <Section
        id="fields"
        title="Field catalogue"
        description={
          <>
            Every <code className="font-mono">col.*</code>
            {" method, rendered live. "}
            The first argument is always a key of your row type; the last is an
            options object — see &quot;Common options&quot; below for the ones
            every field shares.
          </>
        }
      >
        <div className="space-y-10">
          {CATEGORIES.map((category) => (
            <div key={category} className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                {category}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {FIELD_DEMOS.filter((f) => f.category === category).map(
                  (field) => (
                    <div key={field.id} className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-mono text-sm font-medium">
                          {field.name}
                        </h4>
                        <span className="font-mono text-xs text-muted-foreground">
                          {field.valueType}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {field.description}
                      </p>
                      <ComponentPreview
                        align="start"
                        minHeight={0}
                        preview={<FieldPreview id={field.id} />}
                        code={field.code}
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="common-options"
        title="Common options"
        description="Every field method accepts these, in addition to its own type-specific options:"
      >
        <CodeBlock code={OPTIONS_COMMON} />
      </Section>

      <Section
        id="standalone"
        title="Display-only usage"
        description={
          <>
            Every field&apos;s underlying{" "}
            <code className="font-mono">FieldType</code> is exported directly
            too (<code className="font-mono">numberField</code>,{" "}
            <code className="font-mono">textField</code>,{" "}
            <code className="font-mono">singleSelectField</code>, …), each with
            a <code className="font-mono">display</code> renderer usable as a
            plain ColumnDef <code className="font-mono">cell</code> — no
            editing, no <code className="font-mono">DataTable</code> runtime
            required. Convenience <code className="font-mono">*Cell</code>{" "}
            functions (<code className="font-mono">currencyCell</code>,{" "}
            <code className="font-mono">dateCell</code>, …) wrap that pattern
            for one-line use inside a raw{" "}
            <code className="font-mono">ColumnDef</code> — this is how
            you&apos;d use Table Fields inside Grouped Data Table today.
          </>
        }
      />
    </div>
  )
}
