"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "Components",
    items: [
      { href: "/docs", label: "Grouped Data Table" },
      { href: "/docs/table-fields", label: "Table Fields" },
      { href: "/docs/data-table", label: "Data Table" },
    ],
  },
]

export function DocsNav() {
  const pathname = usePathname()
  return (
    <nav className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.title} className="space-y-2">
          <p className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      active && "bg-muted font-medium text-foreground"
                    )}
                  >
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
