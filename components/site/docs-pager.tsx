"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { DOCS_GROUPS } from "@/components/site/docs-links"

// Flatten the grouped nav into the reading order used for prev/next paging,
// keeping each item's group title: two pages can share a label ("Overview"
// exists under both Getting Started and Blocks), so a card reading just
// "Next → Overview" is ambiguous without its group.
const ORDERED = DOCS_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.title })),
)

export function DocsPager() {
  const pathname = usePathname()
  const index = ORDERED.findIndex((item) => item.href === pathname)
  if (index === -1) return null

  const prev = ORDERED[index - 1]
  const next = ORDERED[index + 1]
  if (!prev && !next) return null

  return (
    <nav className="mt-16 flex items-stretch gap-4 border-t pt-8">
      {prev ? (
        <PagerLink item={prev} direction="prev" />
      ) : (
        <span className="flex-1" />
      )}
      {next ? (
        <PagerLink item={next} direction="next" />
      ) : (
        <span className="flex-1" />
      )}
    </nav>
  )
}

function PagerLink({
  item,
  direction,
}: {
  item: (typeof ORDERED)[number]
  direction: "prev" | "next"
}) {
  const isNext = direction === "next"
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex flex-1 flex-col gap-1 rounded-lg border p-4 transition-colors hover:border-foreground/20 hover:bg-muted/40",
        isNext ? "items-end text-right" : "items-start"
      )}
    >
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {!isNext && (
          <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" />
        )}
        {isNext ? "Next" : "Previous"}
        <span aria-hidden="true">·</span>
        {item.group}
        {isNext && (
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        )}
      </span>
      <span className="text-sm font-medium">{item.label}</span>
    </Link>
  )
}
