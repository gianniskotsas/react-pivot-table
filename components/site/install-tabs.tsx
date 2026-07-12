"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"

import { cn } from "@/lib/utils"

const PACKAGE_MANAGERS = [
  {
    id: "npm",
    label: "npm",
    cmd: (pkg: string) => `npx shadcn@latest add ${pkg}`,
  },
  {
    id: "pnpm",
    label: "pnpm",
    cmd: (pkg: string) => `pnpm dlx shadcn@latest add ${pkg}`,
  },
  {
    id: "yarn",
    label: "yarn",
    cmd: (pkg: string) => `yarn dlx shadcn@latest add ${pkg}`,
  },
  {
    id: "bun",
    label: "bun",
    cmd: (pkg: string) => `bunx --bun shadcn@latest add ${pkg}`,
  },
] as const

type InstallTabsProps = {
  /** Registry item name, e.g. "@kotsas-ui/data-table". */
  package: string
  className?: string
}

export function InstallTabs({ package: pkg, className }: InstallTabsProps) {
  const [manager, setManager] =
    React.useState<(typeof PACKAGE_MANAGERS)[number]["id"]>("npm")
  const [copied, setCopied] = React.useState(false)

  const active =
    PACKAGE_MANAGERS.find((m) => m.id === manager) ?? PACKAGE_MANAGERS[0]
  const command = active.cmd(pkg)

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — no-op
    }
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      <div className="flex h-10 items-center gap-4 border-b px-3 text-sm">
        {PACKAGE_MANAGERS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setManager(m.id)}
            data-active={m.id === manager}
            className="relative h-full text-muted-foreground transition-colors data-[active=true]:text-foreground"
          >
            {m.label}
            {m.id === manager ? (
              <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" />
            ) : null}
          </button>
        ))}
      </div>
      <div className="group relative flex items-center px-4 py-3">
        <code className="flex-1 overflow-x-auto font-mono text-[13px] whitespace-pre text-foreground">
          {command}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy command"}
          className="ml-3 inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3.5 text-foreground" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}
