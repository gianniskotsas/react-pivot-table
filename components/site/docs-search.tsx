"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { DOCS_GROUPS } from "@/components/site/docs-links"

export function DocsSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        // Don't hijack ⌘K while the user is typing in an input/textarea/
        // contenteditable (e.g. editing a table cell in a demo).
        const target = e.target as HTMLElement | null
        if (
          target &&
          (target.isContentEditable ||
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA")
        ) {
          return
        }
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const go = React.useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router],
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search docs"
        className="inline-flex h-8 items-center gap-2 rounded-full border border-border/60 bg-muted/40 pr-1.5 pl-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
      >
        <Search className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="pointer-events-none hidden rounded-full border bg-background px-1.5 py-px font-sans text-[10px] font-medium text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search docs"
        description="Search blocks and features…"
      >
        <CommandInput placeholder="Search blocks and features…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {DOCS_GROUPS.map((group, index) => (
            <React.Fragment key={group.title}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={group.title}>
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <CommandItem
                      key={item.href}
                      // Group prefix keeps the two "Overview" entries (docs
                      // root vs blocks index) distinct for cmdk's value
                      // matching, which dedupes/collides on equal values.
                      value={`${group.title} ${item.label}`}
                      keywords={item.keywords}
                      onSelect={() => go(item.href)}
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {item.label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
