"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowDownUp,
  BookOpen,
  Columns3,
  Download,
  Filter,
  LayoutGrid,
  Megaphone,
  MousePointerClick,
  MoveHorizontal,
  Rows3,
  ShoppingCart,
  SquareStack,
  Sigma,
  Undo2,
  Users,
  Wallet,
} from "lucide-react"

import { cn } from "@/lib/utils"

const GROUPS: {
  title: string
  items: {
    href: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[]
}[] = [
  {
    title: "Getting Started",
    items: [{ href: "/docs", label: "Overview", icon: BookOpen }],
  },
  {
    title: "Blocks",
    items: [
      { href: "/docs/blocks", label: "Overview", icon: LayoutGrid },
      { href: "/docs/blocks/financials", label: "Financials", icon: Wallet },
      { href: "/docs/blocks/crm", label: "CRM", icon: Users },
      {
        href: "/docs/blocks/marketing-campaigns",
        label: "Marketing Campaigns",
        icon: Megaphone,
      },
      {
        href: "/docs/blocks/reservations",
        label: "Reservations",
        icon: ShoppingCart,
      },
    ],
  },
  {
    title: "Features",
    items: [
      { href: "/docs/sorting", label: "Sorting", icon: ArrowDownUp },
      { href: "/docs/filtering", label: "Filtering", icon: Filter },
      {
        href: "/docs/column-management",
        label: "Column Management",
        icon: Columns3,
      },
      {
        href: "/docs/column-resizing",
        label: "Column Resizing",
        icon: MoveHorizontal,
      },
      {
        href: "/docs/row-selection",
        label: "Row Selection & Actions",
        icon: MousePointerClick,
      },
      {
        href: "/docs/footer-aggregation",
        label: "Footer & Aggregation",
        icon: Sigma,
      },
      {
        href: "/docs/copy-paste-undo",
        label: "Copy/Paste & Undo",
        icon: Undo2,
      },
      { href: "/docs/export", label: "Export Data", icon: Download },
      { href: "/docs/grouping", label: "Grouping & Hierarchy", icon: Rows3 },
      { href: "/docs/field-types", label: "Field Types", icon: SquareStack },
    ],
  },
]

export function DocsNav() {
  const pathname = usePathname()
  return (
    <nav className="space-y-7">
      {GROUPS.map((group) => (
        <div key={group.title} className="space-y-1.5">
          <p className="px-2.5 text-[11px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
            {group.title}
          </p>
          <ul className="relative space-y-px border-l border-border/60 pl-0">
            {group.items.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <li key={item.href} className="relative">
                  {active && (
                    <span
                      aria-hidden
                      className="absolute top-1.5 -left-px h-[calc(100%-12px)] w-px bg-primary"
                    />
                  )}
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-r-md py-1.5 pr-2 pl-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                      active && "bg-primary/5 font-medium text-primary"
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
