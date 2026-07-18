"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { DocsSearch } from "@/components/site/docs-search"
import { GithubStars } from "@/components/site/github-stars"
import { ThemeToggle } from "@/components/site/theme-toggle"

// Longest-prefix wins: /docs/blocks/* highlights Blocks, every other /docs/*
// highlights Docs — a plain startsWith would light both up at once.
const NAV = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/blocks", label: "Blocks" },
]

function activeHref(pathname: string): string | null {
  const matches = NAV.filter(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  )
  if (matches.length === 0) return null
  return matches.reduce((a, b) => (b.href.length > a.href.length ? b : a)).href
}

export function SiteHeader() {
  const pathname = usePathname()
  const active = activeHref(pathname)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-sm font-medium tracking-tight"
          >
            <span
              aria-hidden
              className="grid size-5 place-items-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground"
            >
              K
            </span>
            Kotsas UI
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  active === item.href && "font-medium text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <DocsSearch />
          <GithubStars />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
