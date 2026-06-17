import type { ReactNode } from "react"

import { CodeBlock } from "@/components/site/code-block"
import { SiteHeader } from "@/components/site/site-header"
import { SimpleDemo } from "@/components/site/simple-demo"
import { AccountsTable } from "@/app/(examples)/accounts/accounts-table"
import { accounts } from "@/app/(examples)/accounts/data"

const FULL_CODE = `<GroupedDataTable<Account>
  data={accounts}
  columns={columns}
  groupableDimensions={[
    { id: "entity", label: "Entity" },
    { id: "bank", label: "Bank" },
  ]}
  initialGrouping={["entity", "bank"]}
  filterableColumns={[
    { id: "entity", label: "Entity", type: "select", options },
    { id: "bank", label: "Bank", type: "select", options },
    { id: "currency", label: "Ccy", type: "select", options },
    { id: "balance", label: "Balance", type: "number" },
  ]}
  groupColumn={{
    header: "Account",
    leaf: {
      icon: () => <Landmark className="size-4 text-muted-foreground" />,
      primary: (row) => row.original.accountName,
      secondary: (row) => row.original.iban,
    },
  }}
/>`

const SIMPLE_CODE = `<GroupedDataTable<Account>
  data={accounts}
  columns={columns}
  groupableDimensions={[
    { id: "entity", label: "Entity" },
    { id: "bank", label: "Bank" },
  ]}
  initialGrouping={["entity"]}
  groupColumn={{
    header: "Account",
    // name-only leaf — no icon, no secondary line
    leaf: { primary: (row) => row.original.accountName },
  }}
/>`

function Example({
  title,
  description,
  demo,
  code,
}: {
  title: string
  description: string
  demo: ReactNode
  code: string
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-xl border bg-card p-4 shadow-sm md:p-6">{demo}</div>
      <CodeBlock filename="usage.tsx" code={code} />
    </section>
  )
}

export default function ExamplesPage() {
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto max-w-5xl space-y-16 px-6 py-12 md:py-16">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Examples</h1>
          <p className="text-muted-foreground">
            Live, interactive demos of the Grouped Data Table. Each is the real
            component — expand groups, open the filter and group-by popovers, drag to
            reorder. Hover a code block to copy it.
          </p>
        </header>

        <Example
          title="Grouping, filters & rich leaf"
          description="Two-level grouping (Entity → Bank), AND/OR filter groups across four columns, summed balances, and a leaf with an icon, name, and IBAN."
          demo={<AccountsTable data={accounts} />}
          code={FULL_CODE}
        />

        <Example
          title="Minimal — name-only leaf"
          description="Group by a single dimension with a name-only leaf (no icon or secondary line) and no filters. The smallest useful config."
          demo={<SimpleDemo />}
          code={SIMPLE_CODE}
        />
      </main>
    </div>
  )
}
