"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"

import { cn } from "@/lib/utils"

function useCopy() {
  const [copied, setCopied] = React.useState(false)
  const copy = React.useCallback((value: string) => {
    if (!navigator?.clipboard) return
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    })
  }, [])
  return { copied, copy }
}

export type ChipCellProps = {
  /** The truncatable text shown inside the pill. */
  label: React.ReactNode
  /** Value written to the clipboard by the hover copy button. */
  copyValue: string
  /** When set, the pill renders as a link. */
  href?: string
  target?: string
  /** Non-shrinking node before the label (e.g. a country flag). */
  leading?: React.ReactNode
  /** Non-shrinking node after the label (e.g. an external-link icon). */
  trailing?: React.ReactNode
  /** Max width of the pill before the label truncates. */
  maxWidthClassName?: string
  className?: string
}

/**
 * An Airtable-style pill (badge) holding a value — truncated — with a
 * copy-to-clipboard button revealed on hover. Used by the url/email/phone
 * fields, and exported for building custom chip cells.
 */
export function ChipCell({
  label,
  copyValue,
  href,
  target,
  leading,
  trailing,
  maxWidthClassName = "max-w-[220px]",
  className,
}: ChipCellProps) {
  const { copied, copy } = useCopy()

  const pillClass = cn(
    "inline-flex min-w-0 items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-sm",
    href && "text-foreground hover:bg-muted",
    className,
  )
  const inner = (
    <>
      {leading}
      <span className="truncate">{label}</span>
      {trailing}
    </>
  )

  return (
    <span
      className={cn(
        "group/chip inline-flex items-center gap-1 align-middle",
        maxWidthClassName,
      )}
    >
      {href ? (
        <a
          href={href}
          target={target}
          rel="noreferrer"
          className={pillClass}
          onClick={(e) => e.stopPropagation()}
        >
          {inner}
        </a>
      ) : (
        <span className={pillClass}>{inner}</span>
      )}
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy"}
        onClick={(e) => {
          e.stopPropagation()
          copy(copyValue)
        }}
        className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-0 transition group-hover/chip:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
      >
        {copied ? (
          <Check className="size-3 text-emerald-500" />
        ) : (
          <Copy className="size-3" />
        )}
      </button>
    </span>
  )
}
