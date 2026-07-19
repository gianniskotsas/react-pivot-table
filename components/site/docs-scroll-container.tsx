"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

/**
 * Docs content scrolls inside this div, not the page (see docs/layout.tsx) —
 * so unlike a page-scrolling site, Next's default scroll-to-top on
 * navigation (which targets the window) never fires here. Reset this
 * container's own scroll position on every route change instead, or
 * navigating from partway down one doc page lands you partway down the next.
 */
export function DocsScrollContainer({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    ref.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    <div ref={ref} className={cn("overflow-y-auto", className)}>
      {children}
    </div>
  )
}
