"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"

import { cn } from "@/lib/utils"

type HeroCopyCommandProps = {
  command: string
  className?: string
}

/** A single-line, un-tabbed copy command for the hero — InstallTabs (site/install-tabs.tsx) is the full per-package-manager picker used in docs bodies; this is the lighter one-liner landing pages lead with. */
export function HeroCopyCommand({ command, className }: HeroCopyCommandProps) {
  const [copied, setCopied] = React.useState(false)

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
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy install command"}
      className={cn(
        // max-w-full + min-w-0 on the code below keep a long command from
        // ever forcing this pill (and the page) wider than the viewport on
        // narrow screens — it truncates instead.
        "group inline-flex max-w-full items-center gap-3 rounded-full border bg-card py-1.5 pr-2 pl-4 text-sm shadow-sm ring-1 ring-foreground/5 transition-colors hover:border-foreground/20",
        className
      )}
    >
      <code className="min-w-0 truncate font-mono text-[13px] text-muted-foreground">
        <span className="select-none text-muted-foreground/50">$ </span>
        {command}
      </code>
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-foreground/10 group-hover:text-foreground">
        {copied ? (
          <Check className="size-3.5 text-emerald-500" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </span>
    </button>
  )
}
