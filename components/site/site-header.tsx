"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const GITHUB_URL = "https://github.com/gianniskotsas/react-pivot-table"

function GithubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.74.5 12.04c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56v-2.02c-3.2.7-3.88-1.38-3.88-1.38-.53-1.35-1.3-1.71-1.3-1.71-1.06-.73.08-.72.08-.72 1.17.08 1.79 1.21 1.79 1.21 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.42.37.8 1.1.8 2.22v3.29c0 .31.21.67.8.56A11.55 11.55 0 0 0 23.5 12.04C23.5 5.74 18.27.5 12 .5Z" />
    </svg>
  )
}

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

// Hydration-safe "has mounted" without a setState-in-effect: the server
// snapshot is false, the client snapshot is true, and the (empty) subscribe
// never fires — so it flips exactly once, on hydration.
const emptySubscribe = () => () => {}
function useMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="rounded-full"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const active = activeHref(pathname)

  return (
    <header className="sticky top-0 z-40 w-full px-4 pt-3">
      <div className="mx-auto flex h-12 max-w-4xl items-center justify-between gap-4 rounded-full border border-border/60 bg-background/75 py-1.5 pr-2 pl-4 shadow-sm ring-1 ring-foreground/5 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="grid size-5 place-items-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground"
          >
            K
          </span>
          Kotsas UI
        </Link>

        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active === item.href && "bg-muted font-medium text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span
            aria-hidden
            className="mx-1 h-4 w-px bg-border"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            aria-label="GitHub repository"
            nativeButton={false}
            render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
          >
            <GithubMark />
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
