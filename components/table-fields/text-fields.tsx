import type * as React from "react"
import type { CellContext } from "@tanstack/react-table"

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
      return isHttpUrl(v) ? (
        <LinkCell href={v} text={v} />
      ) : (
        <span className="truncate inline-block max-w-full align-bottom">{v}</span>
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
      return v ? <LinkCell href={`tel:${v}`} text={v} /> : null
    },
    ...identityClipboard,
  }
}

type StringCell<TData> = (ctx: CellContext<TData, string>) => React.ReactNode
export const textCell = <TData,>() => textField().display as StringCell<TData>
export const longTextCell = <TData,>() => longTextField().display as StringCell<TData>
export const urlCell = <TData,>() => urlField().display as StringCell<TData>
export const emailCell = <TData,>() => emailField().display as StringCell<TData>
export const phoneCell = <TData,>() => phoneField().display as StringCell<TData>
