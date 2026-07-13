"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"

import { cn } from "@/lib/utils"

type ComponentPreviewProps = {
  /** The live, rendered component. */
  preview: React.ReactNode
  /** Source snippet shown in the "Code" tab. */
  code: string
  /** Optional filename shown above the code snippet. */
  filename?: string
  /** Alignment of the preview content within the canvas. Defaults to "center". */
  align?: "center" | "start"
  /** Minimum height of the preview canvas. Defaults to 220px. */
  minHeight?: number
  className?: string
}

export function ComponentPreview({
  preview,
  code,
  filename,
  align = "center",
  minHeight = 220,
  className,
}: ComponentPreviewProps) {
  const [view, setView] = React.useState<"preview" | "code">("preview")
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
        "overflow-hidden rounded-lg border bg-card shadow-sm ring-1 ring-foreground/5",
        className
      )}
    >
      <div className="flex h-10 items-center justify-between border-b px-3">
        <div className="flex h-full items-center gap-4 text-sm">
          <button
            type="button"
            onClick={() => setView("preview")}
            data-active={view === "preview"}
            className="relative h-full text-muted-foreground transition-colors data-[active=true]:text-foreground"
          >
            Preview
            {view === "preview" ? (
              <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setView("code")}
            data-active={view === "code"}
            className="relative h-full text-muted-foreground transition-colors data-[active=true]:text-foreground"
          >
            Code
            {view === "code" ? (
              <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" />
            ) : null}
          </button>
        </div>
        {view === "code" ? (
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Copied" : "Copy code"}
            className="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition hover:text-foreground"
          >
            {copied ? (
              <Check className="size-3.5 text-foreground" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        ) : null}
      </div>

      {view === "preview" ? (
        <div
          style={{ minHeight }}
          className={cn(
            "flex w-full overflow-auto bg-[radial-gradient(color-mix(in_oklch,var(--foreground),transparent_92%)_1px,transparent_1px)] bg-[size:16px_16px] p-8",
            align === "center"
              ? "items-center justify-center"
              : "items-start justify-start"
          )}
        >
          {preview}
        </div>
      ) : (
        <div className="overflow-hidden">
          {filename ? (
            <div className="border-b px-4 py-2 font-mono text-xs text-muted-foreground">
              {filename}
            </div>
          ) : null}
          <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
            <code className="font-mono">{code}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
