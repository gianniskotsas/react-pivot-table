import Link from "next/link"
import { ArrowRight, ShoppingCart, Users, Wallet, Megaphone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { PageHeader, Section } from "@/components/site/page-header"

const BLOCKS = [
  {
    href: "/docs/blocks/financials",
    icon: Wallet,
    name: "Financials",
    description:
      "Transactions table with category/account filters, sign-colored amounts, and live totals.",
    status: "ready" as const,
  },
  {
    icon: Users,
    name: "CRM",
    description: "Contacts and deals, pipeline-stage grouping, activity log.",
    status: "soon" as const,
  },
  {
    icon: ShoppingCart,
    name: "Reservations",
    description: "Bookings table with date-range filters and status badges.",
    status: "soon" as const,
  },
  {
    icon: Megaphone,
    name: "Marketing Campaigns",
    description: "Campaign performance grid with spend/return aggregation.",
    status: "soon" as const,
  },
]

const PAGE_MARKDOWN = `# Blocks

Fully styled, ready-to-copy tables for a specific use case — start from one
instead of building from scratch.

${BLOCKS.map((b) => `- ${b.name}${b.status === "soon" ? " (coming soon)" : ""}: ${b.description}`).join("\n")}
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
          {BLOCKS.map(({ href, icon: Icon, name, description, status }) => {
            const content = (
              <>
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-medium">{name}</h3>
                    {status === "soon" ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Soon
                      </Badge>
                    ) : (
                      <ArrowRight className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>
              </>
            )
            return status === "ready" && href ? (
              <Link
                key={name}
                href={href}
                className="group flex items-start gap-3 rounded-lg border p-4 transition-colors hover:border-foreground/20"
              >
                {content}
              </Link>
            ) : (
              <div
                key={name}
                className="flex items-start gap-3 rounded-lg border border-dashed p-4 opacity-60"
              >
                {content}
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
