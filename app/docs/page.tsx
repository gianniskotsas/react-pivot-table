import Link from "next/link"
import {
  ArrowDownUp,
  ArrowRight,
  Columns3,
  MousePointerClick,
  Rows3,
  Sigma,
  SquareStack,
  Table2,
  Undo2,
} from "lucide-react"

import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"

const FEATURES = [
  {
    href: "/docs/sorting-filtering",
    icon: ArrowDownUp,
    name: "Sorting & Filtering",
    description: "Click-to-sort columns, and AND/OR filter groups.",
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
    description: "Tri-state select-all and shift-click range select.",
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
    description: "Excel-style TSV copy/paste, undo/redo, and CSV export.",
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

const COMPONENTS = [
  {
    href: "/docs/components/data-table",
    icon: Table2,
    name: "Data Table",
    description: "Editable spreadsheet-style grid.",
  },
  {
    href: "/docs/components/grouped-data-table",
    icon: Rows3,
    name: "Grouped Data Table",
    description: "AG-Grid-style grouping / drill-down table.",
  },
  {
    href: "/docs/components/table-fields",
    icon: SquareStack,
    name: "Table Fields",
    description: "The field-type catalogue behind Data Table.",
  },
]

const PAGE_MARKDOWN = `# Kotsas UI

Copy-paste, typed table components for shadcn/ui, built on TanStack Table.

## Features
${FEATURES.map((f) => `- [${f.name}](${f.href}): ${f.description}`).join("\n")}

## Components
${COMPONENTS.map((c) => `- [${c.name}](${c.href}): ${c.description}`).join("\n")}
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
        description="Copy-paste, typed table components for shadcn/ui, built on TanStack Table. Browse by what you're trying to do (Features), or jump straight to a component's install command and props (Components)."
      />

      <Section
        id="features"
        title="Features"
        description="Capabilities, documented once — each page notes which component(s) support it today."
      >
        <CardGrid items={FEATURES} />
      </Section>

      <Section
        id="components"
        title="Components"
        description="Install commands, full props reference, and a minimal usage example per component."
      >
        <CardGrid items={COMPONENTS} />
      </Section>
    </div>
  )
}
