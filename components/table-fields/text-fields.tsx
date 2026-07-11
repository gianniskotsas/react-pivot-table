import type * as React from "react"
import type { CellContext } from "@tanstack/react-table"
import { ExternalLink } from "lucide-react"
import parsePhoneNumber from "libphonenumber-js"

import { cn } from "@/lib/utils"
import { FIELD_ICONS } from "./icons"
import type { FieldType } from "./types"

const identityClipboard = {
  toClipboard: (v: string) => v ?? "",
  fromClipboard: (t: string) => t,
}

const linkClass =
  "text-primary underline-offset-4 hover:underline truncate inline-block max-w-full align-bottom"

function LinkCell({ href, text }: { href: string; text: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={linkClass}
      onClick={(e) => e.stopPropagation()}
    >
      {text}
    </a>
  )
}

/**
 * Only http(s) URLs render as clickable links. React does not sanitize `href`,
 * so rendering a raw cell value (which, in an editable grid, may be attacker- or
 * import-supplied) as a link would allow `javascript:`/`data:` href injection.
 * Non-http(s) values fall back to plain, non-clickable text.
 */
function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/** Bare hostname for display (drops the leading `www.`); falls back to the raw value. */
function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/**
 * Regional-indicator flag emoji from an ISO 3166-1 alpha-2 country code.
 * Renders on most platforms; Windows lacks flag-emoji glyphs (shows the letters).
 */
function flagEmoji(country: string): string {
  return country
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

export function textField(): FieldType<string> {
  return {
    name: "text",
    icon: FIELD_ICONS.text,
    display: (ctx) => ctx.getValue(),
    ...identityClipboard,
  }
}

export function longTextField(): FieldType<string> {
  return {
    name: "longText",
    icon: FIELD_ICONS.longText,
    display: (ctx) => (
      <span className="truncate inline-block max-w-full align-bottom">
        {ctx.getValue()}
      </span>
    ),
    ...identityClipboard,
  }
}

export function urlField(): FieldType<string> {
  return {
    name: "url",
    icon: FIELD_ICONS.url,
    display: (ctx) => {
      const v = ctx.getValue()
      if (!v) return null
      if (!isHttpUrl(v)) {
        return <span className="truncate inline-block max-w-full align-bottom">{v}</span>
      }
      return (
        <a
          href={v}
          target="_blank"
          rel="noreferrer"
          className={cn(linkClass, "inline-flex items-center gap-1")}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate">{hostname(v)}</span>
          <ExternalLink className="size-3 shrink-0 opacity-60" aria-hidden="true" />
        </a>
      )
    },
    ...identityClipboard,
  }
}

export function emailField(): FieldType<string> {
  return {
    name: "email",
    icon: FIELD_ICONS.email,
    display: (ctx) => {
      const v = ctx.getValue()
      return v ? <LinkCell href={`mailto:${v}`} text={v} /> : null
    },
    ...identityClipboard,
  }
}

export function phoneField(): FieldType<string> {
  return {
    name: "phone",
    icon: FIELD_ICONS.phone,
    display: (ctx) => {
      const v = ctx.getValue()
      if (!v) return null
      const parsed = parsePhoneNumber(v)
      if (!parsed) {
        // Unparseable: fall back to a raw tel: link so nothing is lost.
        return <LinkCell href={`tel:${v}`} text={v} />
      }
      const flag = parsed.country ? flagEmoji(parsed.country) : null
      return (
        <a
          href={parsed.getURI()}
          className={cn(linkClass, "inline-flex items-center gap-1.5")}
          onClick={(e) => e.stopPropagation()}
        >
          {flag ? <span aria-hidden="true">{flag}</span> : null}
          <span className="truncate">{parsed.formatInternational()}</span>
        </a>
      )
    },
    ...identityClipboard,
  }
}

type StringCell<TData> = (ctx: CellContext<TData, unknown>) => React.ReactNode
function stringCell<TData>(f: FieldType<string>): StringCell<TData> {
  return (ctx) => f.display(ctx as CellContext<unknown, string>)
}
export const textCell = <TData,>() => stringCell<TData>(textField())
export const longTextCell = <TData,>() => stringCell<TData>(longTextField())
export const urlCell = <TData,>() => stringCell<TData>(urlField())
export const emailCell = <TData,>() => stringCell<TData>(emailField())
export const phoneCell = <TData,>() => stringCell<TData>(phoneField())
