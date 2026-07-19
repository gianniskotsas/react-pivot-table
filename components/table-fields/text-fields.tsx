import type * as React from "react"
import type { CellContext } from "@tanstack/react-table"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons"
import parsePhoneNumber from "libphonenumber-js"

import { Input } from "@/components/ui/input"

import { ChipCell } from "./chip"
import { FIELD_ICONS } from "./icons"
import type { FieldEditContext, FieldType } from "./types"

const identityClipboard = {
  toClipboard: (v: string) => v ?? "",
  fromClipboard: (t: string) => t,
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

/** Shared single-line text edit renderer for text/url/email/phone (edits the raw value). */
function textEdit(ctx: FieldEditContext<string>) {
  return (
    <Input
      autoFocus
      value={ctx.value ?? ""}
      onChange={(e) => ctx.setValue(e.target.value)}
      onBlur={ctx.commit}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Enter") {
          e.preventDefault()
          ctx.commit()
          ctx.focusNext("down")
        } else if (e.key === "Escape") {
          e.preventDefault()
          ctx.cancel()
        } else if (e.key === "Tab") {
          e.preventDefault()
          ctx.commit()
          ctx.focusNext(e.shiftKey ? "prev" : "next")
        }
      }}
      className="h-8"
    />
  )
}

/** Multi-line edit renderer for longText. Native textarea (no shadcn Textarea installed). */
function longTextEdit(ctx: FieldEditContext<string>) {
  return (
    <textarea
      autoFocus
      value={ctx.value ?? ""}
      onChange={(e) => ctx.setValue(e.target.value)}
      onBlur={ctx.commit}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Escape") {
          e.preventDefault()
          ctx.cancel()
        }
        // Enter inserts a newline (default textarea behavior); Shift+Enter is
        // not required to commit — blur or Escape are the exit paths.
      }}
      rows={3}
      className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  )
}

export function textField(): FieldType<string> {
  return {
    name: "text",
    icon: FIELD_ICONS.text,
    display: (ctx) => ctx.getValue(),
    edit: textEdit,
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
    edit: longTextEdit,
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
        <ChipCell
          href={v}
          target="_blank"
          label={hostname(v)}
          copyValue={v}
          maxWidthClassName="max-w-full"
          trailing={
            <HugeiconsIcon
              icon={ArrowUpRight01Icon}
              className="size-3 shrink-0 opacity-60"
              aria-hidden="true"
            />
          }
        />
      )
    },
    edit: textEdit,
    ...identityClipboard,
  }
}

export function emailField(): FieldType<string> {
  return {
    name: "email",
    icon: FIELD_ICONS.email,
    display: (ctx) => {
      const v = ctx.getValue()
      return v ? (
        <ChipCell
          href={`mailto:${v}`}
          label={v}
          copyValue={v}
          maxWidthClassName="max-w-full"
        />
      ) : null
    },
    edit: textEdit,
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
        return (
          <ChipCell
            href={`tel:${v}`}
            label={v}
            copyValue={v}
            maxWidthClassName="max-w-full"
          />
        )
      }
      const flag = parsed.country ? flagEmoji(parsed.country) : null
      return (
        <ChipCell
          href={parsed.getURI()}
          label={parsed.formatInternational()}
          copyValue={parsed.number ?? parsed.formatInternational()}
          maxWidthClassName="max-w-full"
          leading={
            flag ? (
              <span aria-hidden="true" className="mr-1 text-[1.15rem] leading-none">
                {flag}
              </span>
            ) : null
          }
        />
      )
    },
    edit: textEdit,
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
