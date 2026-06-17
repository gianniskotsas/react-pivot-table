import Link from "next/link"
import { ArrowRight, Filter, GripVertical, Layers, Sigma } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CodeBlock } from "@/components/site/code-block"
import { SiteHeader } from "@/components/site/site-header"
import { AccountsTable } from "@/app/(examples)/accounts/accounts-table"
import { accounts } from "@/app/(examples)/accounts/data"

const INSTALL = "npx shadcn@latest add https://ui.kotsas.com/r/grouped-data-table.json"

const FEATURES = [
  {
    icon: Layers,
    title: "Row grouping & drill-down",
    body: "A single auto group column with indented hierarchy, expand/collapse, and per-group counts.",
  },
  {
    icon: GripVertical,
    title: "Drag-and-drop dimensions",
    body: "Pick groupable dimensions in a dropdown and reorder the hierarchy by dragging.",
  },
  {
    icon: Filter,
    title: "AND / OR filter groups",
    body: "Airtable-style filter groups with readable operators and a live-recomputing table.",
  },
  {
    icon: Sigma,
    title: "Headless & typed",
    body: "Built on TanStack Table v8, generic over your row type, with optional aggregations.",
  },
]

export default function HomePage() {
  return (
    <div className="min-h-svh">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <Badge variant="secondary" className="rounded-full font-normal">
            shadcn registry · base-ui
          </Badge>
          <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Grouped data tables, the shadcn way.
          </h1>
          <p className="max-w-xl text-balance text-muted-foreground md:text-lg">
            A copy-paste, AG-Grid-style grouping &amp; drill-down table — row hierarchy,
            drag-and-drop dimensions, and AND/OR filter groups. Built on TanStack Table v8.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/examples" />}>
              View examples
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/docs" />}>
              Documentation
            </Button>
          </div>
          <div className="w-full max-w-2xl pt-2 text-left">
            <CodeBlock code={INSTALL} />
          </div>
        </section>

        {/* Live preview */}
        <section className="pb-8">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Live preview
            </span>
            <Link
              href="/examples"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              See more examples →
            </Link>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
            <AccountsTable data={accounts} />
          </div>
        </section>

        {/* Features */}
        <section className="my-16 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-background p-6">
              <Icon className="size-5 text-muted-foreground" />
              <h3 className="mt-3 font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>Kotsas UI — Grouped Data Table</span>
          <span>
            Built with{" "}
            <a
              href="https://ui.shadcn.com"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              shadcn/ui
            </a>{" "}
            &amp; TanStack Table
          </span>
        </div>
      </footer>
    </div>
  )
}
