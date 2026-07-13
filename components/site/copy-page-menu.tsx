"use client"

import * as React from "react"
import { Check, ChevronDown, Copy, ExternalLink, FileText } from "lucide-react"

import { cn } from "@/lib/utils"

type CopyPageMenuProps = {
  /** Plain-text/markdown representation of the page, used for "Copy Page" and "View as Markdown". */
  markdown: string
  /** Absolute or relative page URL, used to build "Open in ChatGPT/Claude/v0" prompts. */
  url: string
  className?: string
}

function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void
) {
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [ref, onOutside])
}

export function CopyPageMenu({ markdown, url, className }: CopyPageMenuProps) {
  const [copied, setCopied] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  useOutsideClick(rootRef, () => setOpen(false))

  async function copyPage() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — no-op
    }
  }

  function viewAsMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown" })
    window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer")
    setOpen(false)
  }

  function openIn(target: "chatgpt" | "claude" | "v0") {
    const absoluteUrl = new URL(url, window.location.origin).toString()
    const prompt = `Read ${absoluteUrl} and help me use this component.`
    const encoded = encodeURIComponent(prompt)
    const targets = {
      chatgpt: `https://chatgpt.com/?q=${encoded}`,
      claude: `https://claude.ai/new?q=${encoded}`,
      v0: `https://v0.dev/chat?q=${encoded}`,
    }
    window.open(targets[target], "_blank", "noopener,noreferrer")
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <div className="inline-flex overflow-hidden rounded-md border">
        <button
          type="button"
          onClick={copyPage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-foreground transition hover:bg-accent"
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy Page"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="More copy options"
          data-active={open}
          className="inline-flex items-center border-l px-2 text-muted-foreground transition hover:bg-accent hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-foreground"
        >
          <ChevronDown className="size-3.5" />
        </button>
      </div>

      {open ? (
        <div className="absolute top-full right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-md border bg-popover py-1 shadow-md">
          <button
            type="button"
            onClick={viewAsMarkdown}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-accent"
          >
            <FileText className="size-3.5 text-muted-foreground" />
            View as Markdown
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => openIn("chatgpt")}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-accent"
          >
            <ExternalLink className="size-3.5 text-muted-foreground" />
            Open in ChatGPT
          </button>
          <button
            type="button"
            onClick={() => openIn("claude")}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-accent"
          >
            <ExternalLink className="size-3.5 text-muted-foreground" />
            Open in Claude
          </button>
          <button
            type="button"
            onClick={() => openIn("v0")}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-accent"
          >
            <ExternalLink className="size-3.5 text-muted-foreground" />
            Open in v0
          </button>
        </div>
      ) : null}
    </div>
  )
}
