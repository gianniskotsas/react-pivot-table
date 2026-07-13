import Link from "next/link"
import { ArrowRight, Megaphone, ShoppingCart, Users, Wallet } from "lucide-react"

import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"

const BLOCKS = [
  {
    href: "/docs/blocks/financials",
    icon: Wallet,
    name: "Financials",
    description:
      "Transactions table with category/account filters, sign-colored amounts, and live totals.",
  },
  {
    href: "/docs/blocks/crm",
    icon: Users,
    name: "CRM",
    description: "Deals pipeline grouped by stage, with owner filters.",
  },
  {
    href: "/docs/blocks/reservations",
    icon: ShoppingCart,
    name: "Reservations",
    description: "Bookings table with date-range filters and status badges.",
  },
  {
    href: "/docs/blocks/marketing-campaigns",
    icon: Megaphone,
    name: "Marketing Campaigns",
    description: "Campaign performance grid with spend/return aggregation.",
  },
]

const PAGE_MARKDOWN = `# Blocks

Fully styled, ready-to-copy tables for a specific use case — start from one
instead of building from scratch.

${BLOCKS.map((b) => `- [${b.name}](${b.href}): ${b.description}`).join("\n")}
`

export default function BlocksOverviewPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Blocks"
        actions={<CopyPageMenu markdown={PAGE_MARKDOWN} url="/docs/blocks" />}
        description="Fully styled, ready-to-copy tables for a specific use case — copy the source, swap in your data."
      />

      <Section id="blocks" title="Available blocks">
        <div className="grid gap-3 sm:grid-cols-2">
          {BLOCKS.map(({ href, icon: Icon, name, description }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
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
      </Section>
    </div>
  )
}
