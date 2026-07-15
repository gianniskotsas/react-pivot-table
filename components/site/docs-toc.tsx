"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type TocItem = { id: string; label: string }

// Scans the rendered page for `<section id>` headings after each navigation and
// tracks which one is in view. Reading the DOM post-mount is the intended use of
// an effect here (there is no server equivalent), so the initial setState is
// deliberate.
export function DocsToc() {
  const pathname = usePathname()
  const [items, setItems] = React.useState<TocItem[]>([])
  const [activeId, setActiveId] = React.useState<string>("")

  React.useEffect(() => {
    const content = document.getElementById("docs-content")
    if (!content) return

    const sections = Array.from(
      content.querySelectorAll<HTMLElement>("section[id]")
    )
    const next: TocItem[] = sections.flatMap((section) => {
      const label = section.querySelector("h2")?.textContent?.trim()
      return label ? [{ id: section.id, label }] : []
    })

    // The active item is the last section whose heading has scrolled past a line
    // a little below the sticky header — the section you're currently reading.
    const computeActive = () => {
      const offset = 140
      let current = sections[0]?.id ?? ""
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= offset) {
          current = section.id
        }
      }
      return current
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading headings from the DOM after mount
    setItems(next)
    setActiveId(computeActive())

    // The page scrolls on the root element, whose scroll events don't surface on
    // window here, so drive updates off the viewport-relative observer instead.
    // Its callbacks fire on mount and whenever a section boundary crosses the
    // line, which is exactly when the active item can change.
    const observer = new IntersectionObserver(
      () => setActiveId(computeActive()),
      { rootMargin: "-140px 0px 0px 0px", threshold: [0, 1] }
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [pathname])

  if (items.length === 0) return null

  return (
    <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-56 shrink-0 overflow-y-auto py-12 xl:block">
      <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">
        On this page
      </p>
      <ul className="border-l border-border/60">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "-ml-px block border-l border-transparent py-1 pl-4 text-sm text-muted-foreground transition-colors hover:text-foreground",
                activeId === item.id &&
                  "border-primary font-medium text-foreground"
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}
