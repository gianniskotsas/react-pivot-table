"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"

import { cn } from "@/lib/utils"

type CodeBlockProps = {
  code: string
  /** Optional filename shown in a header bar. */
  filename?: string
  className?: string
}

export function CodeBlock({ code, filename, className }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — no-op
    }
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-muted/40",
        className
      )}
    >
      {filename ? (
        <div className="flex items-center border-b px-4 py-2 font-mono text-xs text-muted-foreground">
          {filename}
        </div>
      ) : null}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute top-2.5 right-2.5 z-10 inline-flex size-7 items-center justify-center rounded-md border bg-background/70 text-muted-foreground backdrop-blur transition hover:text-foreground focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
      >
        {copied ? (
          <Check className="size-3.5 text-foreground" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  )
}
