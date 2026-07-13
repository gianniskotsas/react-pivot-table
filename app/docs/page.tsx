import Link from "next/link"
import {
  ArrowDownUp,
  ArrowRight,
  Columns3,
  Download,
  Filter,
  LayoutGrid,
  MousePointerClick,
  Rows3,
  Sigma,
  SquareStack,
  Undo2,
  Wallet,
} from "lucide-react"

import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"

const BLOCKS = [
  {
    href: "/docs/blocks",
    icon: LayoutGrid,
    name: "Overview",
    description: "Ready-to-copy, styled tables for specific use cases.",
  },
  {
    href: "/docs/blocks/financials",
    icon: Wallet,
    name: "Financials",
    description: "Transactions table with category filters and totals.",
  },
]

const FEATURES = [
  {
    href: "/docs/sorting",
    icon: ArrowDownUp,
    name: "Sorting",
    description: "Click-to-sort columns, ascending / descending / none.",
  },
  {
    href: "/docs/filtering",
    icon: Filter,
    name: "Filtering",
    description: "AND/OR filter groups over readable operators.",
  },
  {
    href: "/docs/column-management",
    icon: Columns3,
    name: "Column Management",
    description: "Show/hide columns and pin them left or right.",
  },
  {
    href: "/docs/row-selection",
    icon: MousePointerClick,
    name: "Row Selection & Actions",
    description: "Tri-state select-all, shift-click range, and bulk actions.",
  },
  {
    href: "/docs/footer-aggregation",
    icon: Sigma,
    name: "Footer & Aggregation",
    description: "Sum/avg/min/max/count, scoped to the current selection.",
  },
  {
    href: "/docs/copy-paste-undo",
    icon: Undo2,
    name: "Copy/Paste & Undo",
    description: "Excel-style TSV copy/paste, and undo/redo.",
  },
  {
    href: "/docs/export",
    icon: Download,
    name: "Export Data",
    description: "Export the current sorted/filtered/visible view to CSV.",
  },
  {
    href: "/docs/grouping",
    icon: Rows3,
    name: "Grouping & Hierarchy",
    description: "Row grouping, drag-and-drop dimensions, drill-down.",
  },
  {
    href: "/docs/field-types",
    icon: SquareStack,
    name: "Field Types",
    description: "Fifteen typed, formatted, clipboard-aware field types.",
  },
]

const PAGE_MARKDOWN = `# Kotsas UI

Copy-paste, typed table components for shadcn/ui, built on TanStack Table.

## Blocks
${BLOCKS.map((b) => `- [${b.name}](${b.href}): ${b.description}`).join("\n")}

## Features
${FEATURES.map((f) => `- [${f.name}](${f.href}): ${f.description}`).join("\n")}
`

function CardGrid({
  items,
}: {
  items: {
    href: string
    icon: React.ComponentType<{ className?: string }>
    name: string
    description: string
  }[]
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(({ href, icon: Icon, name, description }) => (
        <Link
          key={href}
          href={href}
          className="group flex items-start gap-3 rounded-lg border p-4 transition-colors hover:border-foreground/20"
        >
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium">{name}</h3>
              <ArrowRight className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default function DocsOverviewPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Overview"
        actions={<CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs" />}
        description="Copy-paste, typed table components for shadcn/ui, built on TanStack Table. Grab a ready-to-copy Block for a specific use case, or browse by what you're trying to do (Features)."
      />

      <Section
        id="blocks"
        title="Blocks"
        description="Fully styled, ready-to-copy tables for a specific use case — start from one instead of building from scratch."
      >
        <CardGrid items={BLOCKS} />
      </Section>

      <Section
        id="features"
        title="Features"
        description="Capabilities, documented once — each page notes which component(s) support it today."
      >
        <CardGrid items={FEATURES} />
      </Section>
    </div>
  )
}
