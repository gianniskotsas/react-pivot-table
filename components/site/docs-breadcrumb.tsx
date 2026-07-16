"use client"

import { ChevronRight } from "lucide-react"
import { usePathname } from "next/navigation"

import { DOCS_GROUPS } from "@/components/site/docs-links"

/**
 * Group → page trail for the docs header ("Features › Sorting"). Fills the
 * header's otherwise-empty left half on desktop and tells the reader where
 * the current page sits in the nav without scanning the sidebar. Hidden on
 * mobile, where the sidebar trigger owns that slot.
 */
export function DocsBreadcrumb() {
  const pathname = usePathname()
  const match = DOCS_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ group: group.title, item })),
  ).find(({ item }) => item.href === pathname)

  if (!match) return null

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm md:flex">
      <span className="text-muted-foreground">{match.group}</span>
      <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
      <span className="font-medium text-foreground">{match.item.label}</span>
    </nav>
  )
}
