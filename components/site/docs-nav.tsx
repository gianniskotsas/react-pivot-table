"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Rows3, SquareStack, Table2 } from "lucide-react"

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
    title: "Components",
    items: [
      { href: "/docs", label: "Grouped Data Table", icon: Rows3 },
      { href: "/docs/table-fields", label: "Table Fields", icon: SquareStack },
      { href: "/docs/data-table", label: "Data Table", icon: Table2 },
    ],
  },
]

export function DocsNav() {
  const pathname = usePathname()
  return (
    <nav className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.title} className="space-y-1">
          <p className="px-2 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                      active && "bg-accent font-medium text-foreground"
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
