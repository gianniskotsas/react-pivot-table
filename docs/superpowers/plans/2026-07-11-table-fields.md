# table-fields (read-only field kit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@kotsas-ui/table-fields` — a standalone, type-safe kit of ~15 Airtable-style field types (display renderers, formatters, header icons, clipboard serialize/parse) usable in *any* shadcn + TanStack Table, with zero dependency on the forthcoming `DataTable` shell.

**Architecture:** Each field is a `FieldType<V>` object binding a value type to a pure `display` renderer, a header `icon`, `align`, and pure `toClipboard`/`fromClipboard` functions. A standalone cell factory (`xCell(opts)`) is just `xField(opts).display`, returning a TanStack `ColumnDef["cell"]`. The `edit` renderer is declared optional on `FieldType` but is NOT implemented here (it needs the grid spine from Plan 2). Formatters are thin `Intl` wrappers. No base-ui/Radix divergence (display is plain markup), so no primitives shim.

**Tech Stack:** React 18+, TypeScript strict, `@tanstack/react-table@8` (types only), shadcn primitives (`Badge`, `Button`), `lucide-react` icons, Vitest + Testing Library + jsdom, shadcn registry.

---

## File Structure

All under `components/table-fields/`:

- `types.ts` — `SelectOption`, `EditableTableMeta`, `FieldEditContext<V>` (type only, for Plan 2), `FieldType<V>`.
- `format.ts` — pure `formatNumber`, `formatCurrency`, `formatPercent`, `formatDuration`.
- `icons.ts` — lucide header-icon exports used by fields.
- `number-fields.tsx` — `numberField`/`numberCell`, `currencyField`/`currencyCell`, `percentField`/`percentCell`, `durationField`/`durationCell`.
- `text-fields.tsx` — `textField`, `longTextField`, `urlField`, `emailField`, `phoneField` (+ matching `*Cell`).
- `choice-fields.tsx` — `singleSelectField`, `multiSelectField`, `checkboxField` (+ `*Cell`).
- `widget-fields.tsx` — `ratingField`, `buttonField`, `dateField` (+ `*Cell`).
- `index.ts` — barrel export.
- One `*.test.ts(x)` beside each implementation file.
- `registry.json` (repo root) — new `table-fields` item; build to `public/r/`.

**Conventions (verified against the repo):**
- Test runner: `pnpm exec vitest run <path>`; setup is `vitest.setup.ts` (`@testing-library/jest-dom/vitest`); test glob `**/*.test.{ts,tsx}`.
- `@/*` aliases repo root. shadcn primitives live in `components/ui/` (`badge.tsx`, `button.tsx` present).
- Typecheck: `pnpm typecheck`. Registry build: `pnpm registry:build`.
- Do all work on a feature branch (not `main`).

---

## Task 0: Branch

- [ ] **Step 1: Create the feature branch**

```bash
cd /Users/gianniskotsas/Documents/WebDev/react-pivot-table
git checkout main && git pull --ff-only origin main
git checkout -b feat/table-fields
```

---

## Task 1: Field contract types

**Files:**
- Create: `components/table-fields/types.ts`
- Test: `components/table-fields/types.test.ts`

- [ ] **Step 1: Write the failing test** (a conforming `FieldType` object type-checks and its members behave)

Create `components/table-fields/types.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import type { CellContext } from "@tanstack/react-table"
import type { FieldType } from "./types"

// A minimal conforming field proves the contract shape compiles and works.
const stringField: FieldType<string> = {
  name: "test-string",
  icon: () => null,
  display: (ctx) => ctx.getValue(),
  toClipboard: (v) => v ?? "",
  fromClipboard: (t) => t,
}

describe("FieldType contract", () => {
  it("exposes name, display, and clipboard round-trip", () => {
    expect(stringField.name).toBe("test-string")
    expect(stringField.toClipboard("hi")).toBe("hi")
    expect(stringField.fromClipboard("hi")).toBe("hi")
    const ctx = { getValue: () => "value" } as unknown as CellContext<unknown, string>
    expect(stringField.display(ctx)).toBe("value")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/table-fields/types.test.ts`
Expected: FAIL — `Failed to resolve import "./types"`.

- [ ] **Step 3: Implement `types.ts`**

Create `components/table-fields/types.ts`:

```ts
import type { CellContext } from "@tanstack/react-table"
import type * as React from "react"

/** A label/value pair for choice fields (single/multi select). */
export type SelectOption = { label: string; value: string }

/**
 * The TanStack table `meta` channel editable cells use to persist a change.
 * Provided by the DataTable shell (Plan 2); display-only usage ignores it.
 */
export type EditableTableMeta = {
  updateData?: (rowId: string, columnId: string, value: unknown) => void
}

/**
 * Runtime context a field's `edit` renderer receives. Declared here so field
 * types are self-describing, but no `edit` renderer is implemented in this
 * package — the grid spine that provides this context lives in `data-table`.
 */
export type FieldEditContext<V> = {
  value: V
  setValue: (next: V) => void
  commit: () => void
  cancel: () => void
  focusNext: (dir: "next" | "prev" | "up" | "down") => void
}

/** Binds a value type V to display + metadata + clipboard (de)serialization. */
export type FieldType<V> = {
  name: string
  icon: React.ComponentType<{ className?: string }>
  align?: "left" | "right" | "center"
  /** Pure display renderer — usable standalone as a ColumnDef cell. */
  display: (ctx: CellContext<unknown, V>) => React.ReactNode
  /** Optional edit renderer; implemented in `data-table` (Plan 2), not here. */
  edit?: (ctx: FieldEditContext<V>) => React.ReactNode
  /** Serialize a value to a clipboard/CSV cell string. */
  toClipboard: (value: V) => string
  /** Parse a clipboard/CSV cell string back to a value (undefined if invalid). */
  fromClipboard: (text: string) => V | undefined
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/table-fields/types.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck` (expect clean).

```bash
git add components/table-fields/types.ts components/table-fields/types.test.ts
git commit -m "feat(table-fields): add FieldType contract types

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Formatters

**Files:**
- Create: `components/table-fields/format.ts`
- Test: `components/table-fields/format.test.ts`

- [ ] **Step 1: Write the failing test**

Create `components/table-fields/format.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { formatCurrency, formatDuration, formatNumber, formatPercent } from "./format"

describe("formatNumber", () => {
  it("formats with grouping and default 2 fraction digits", () => {
    expect(formatNumber(1234.5)).toBe("1,234.5")
  })
  it("returns empty string for null/NaN", () => {
    expect(formatNumber(NaN)).toBe("")
    expect(formatNumber(null as unknown as number)).toBe("")
  })
})

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(1000)).toBe("$1,000.00")
  })
  it("honors the currency option", () => {
    expect(formatCurrency(1000, { currency: "EUR" })).toBe("€1,000.00")
  })
})

describe("formatPercent", () => {
  it("treats the value as a fraction of 1", () => {
    expect(formatPercent(0.75)).toBe("75%")
  })
})

describe("formatDuration", () => {
  it("defaults to minutes as m:ss", () => {
    expect(formatDuration(90)).toBe("1:30")
    expect(formatDuration(5)).toBe("0:05")
  })
  it("supports h:mm:ss with the hms unit", () => {
    expect(formatDuration(3661, { unit: "hms" })).toBe("1:01:01")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/table-fields/format.test.ts`
Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 3: Implement `format.ts`**

Create `components/table-fields/format.ts`:

```ts
function isBlank(value: number): boolean {
  return value == null || Number.isNaN(value)
}

export function formatNumber(
  value: number,
  opts: { locale?: string; maximumFractionDigits?: number } = {},
): string {
  if (isBlank(value)) return ""
  return new Intl.NumberFormat(opts.locale ?? "en-US", {
    maximumFractionDigits: opts.maximumFractionDigits ?? 2,
  }).format(value)
}

export function formatCurrency(
  value: number,
  opts: { currency?: string; locale?: string } = {},
): string {
  if (isBlank(value)) return ""
  return new Intl.NumberFormat(opts.locale ?? "en-US", {
    style: "currency",
    currency: opts.currency ?? "USD",
  }).format(value)
}

export function formatPercent(
  value: number,
  opts: { locale?: string; maximumFractionDigits?: number } = {},
): string {
  if (isBlank(value)) return ""
  return new Intl.NumberFormat(opts.locale ?? "en-US", {
    style: "percent",
    maximumFractionDigits: opts.maximumFractionDigits ?? 1,
  }).format(value)
}

/**
 * Durations are stored as a number of seconds. Default display unit is minutes,
 * rendered as `m:ss`. The `hms` unit renders `h:mm:ss`.
 */
export function formatDuration(
  seconds: number,
  opts: { unit?: "minutes" | "hms" } = {},
): string {
  if (isBlank(seconds)) return ""
  const total = Math.max(0, Math.floor(seconds))
  if (opts.unit === "hms") {
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/table-fields/format.test.ts`
Expected: PASS (7 assertions across 4 groups). Note: `Intl` currency symbols are stable in Node's full-ICU build (the repo's Node ships full ICU); if `€` renders as `EUR`, that's an ICU-data issue in the runner — flag it, don't weaken the test.

- [ ] **Step 5: Commit**

```bash
git add components/table-fields/format.ts components/table-fields/format.test.ts
git commit -m "feat(table-fields): add Intl formatters (number/currency/percent/duration)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Header icons

**Files:**
- Create: `components/table-fields/icons.ts`
- Test: `components/table-fields/icons.test.ts`

- [ ] **Step 1: Write the failing test**

Create `components/table-fields/icons.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { FIELD_ICONS } from "./icons"

describe("FIELD_ICONS", () => {
  it("maps every Release-1 field name to an icon component", () => {
    const names = [
      "number", "currency", "percent", "duration",
      "text", "longText", "url", "email", "phone",
      "singleSelect", "multiSelect", "checkbox",
      "rating", "button", "date",
    ]
    for (const name of names) {
      expect(typeof FIELD_ICONS[name]).toBe("object") // lucide icons are forwardRef objects
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/table-fields/icons.test.ts`
Expected: FAIL — cannot resolve `./icons`.

- [ ] **Step 3: Implement `icons.ts`**

Create `components/table-fields/icons.ts`:

```ts
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  Clock,
  Hash,
  Link as LinkIcon,
  List,
  ListChecks,
  Mail,
  MousePointerClick,
  Percent,
  Phone,
  Star,
  Type,
} from "lucide-react"

/** Header type icon per field name (Airtable-style). */
export const FIELD_ICONS = {
  number: Hash,
  currency: Hash,
  percent: Percent,
  duration: Clock,
  text: Type,
  longText: AlignLeft,
  url: LinkIcon,
  email: Mail,
  phone: Phone,
  singleSelect: List,
  multiSelect: ListChecks,
  checkbox: CheckSquare,
  rating: Star,
  button: MousePointerClick,
  date: Calendar,
} as const
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/table-fields/icons.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/table-fields/icons.ts components/table-fields/icons.test.ts
git commit -m "feat(table-fields): add per-field header icons

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Number fields

**Files:**
- Create: `components/table-fields/number-fields.tsx`
- Test: `components/table-fields/number-fields.test.tsx`

Value type is `number`. Each `xField(opts)` returns a `FieldType<number>`; each `xCell(opts)` is `xField(opts).display` (standalone ColumnDef cell). `toClipboard` emits the raw number as a string; `fromClipboard` strips non-numeric characters (so `"$1,000"` parses to `1000`).

- [ ] **Step 1: Write the failing test**

Create `components/table-fields/number-fields.test.tsx`:

```tsx
import { render } from "@testing-library/react"
import type { CellContext } from "@tanstack/react-table"
import { describe, expect, it } from "vitest"
import {
  currencyField,
  durationField,
  numberField,
  percentField,
} from "./number-fields"

function ctx(value: number): CellContext<unknown, number> {
  return { getValue: () => value } as unknown as CellContext<unknown, number>
}

describe("number fields", () => {
  it("numberField displays grouped number, right-aligned, Hash icon", () => {
    const f = numberField()
    expect(f.name).toBe("number")
    expect(f.align).toBe("right")
    const { container } = render(<>{f.display(ctx(1234.5))}</>)
    expect(container.textContent).toBe("1,234.5")
  })

  it("currencyField displays currency and round-trips clipboard", () => {
    const f = currencyField({ currency: "USD" })
    const { container } = render(<>{f.display(ctx(1000))}</>)
    expect(container.textContent).toBe("$1,000.00")
    expect(f.toClipboard(1000)).toBe("1000")
    expect(f.fromClipboard("$1,000.00")).toBe(1000)
    expect(f.fromClipboard("nope")).toBeUndefined()
  })

  it("percentField displays a percent", () => {
    const { container } = render(<>{percentField().display(ctx(0.75))}</>)
    expect(container.textContent).toBe("75%")
  })

  it("durationField displays minutes by default", () => {
    const { container } = render(<>{durationField().display(ctx(90))}</>)
    expect(container.textContent).toBe("1:30")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/table-fields/number-fields.test.tsx`
Expected: FAIL — cannot resolve `./number-fields`.

- [ ] **Step 3: Implement `number-fields.tsx`**

Create `components/table-fields/number-fields.tsx`:

```tsx
import type { CellContext } from "@tanstack/react-table"

import { formatCurrency, formatDuration, formatNumber, formatPercent } from "./format"
import { FIELD_ICONS } from "./icons"
import type { FieldType } from "./types"

/** Parse a possibly-formatted numeric string (e.g. "$1,000.00") to a number. */
function parseNumeric(text: string): number | undefined {
  const cleaned = text.replace(/[^0-9.-]/g, "")
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return undefined
  const n = Number(cleaned)
  return Number.isNaN(n) ? undefined : n
}

function toClipboardNumber(value: number): string {
  return value == null || Number.isNaN(value) ? "" : String(value)
}

export function numberField(
  opts: { locale?: string; maximumFractionDigits?: number } = {},
): FieldType<number> {
  return {
    name: "number",
    icon: FIELD_ICONS.number,
    align: "right",
    display: (ctx) => (
      <span className="tabular-nums">{formatNumber(ctx.getValue(), opts)}</span>
    ),
    toClipboard: toClipboardNumber,
    fromClipboard: parseNumeric,
  }
}

export function currencyField(
  opts: { currency?: string; locale?: string } = {},
): FieldType<number> {
  return {
    name: "currency",
    icon: FIELD_ICONS.currency,
    align: "right",
    display: (ctx) => (
      <span className="tabular-nums">{formatCurrency(ctx.getValue(), opts)}</span>
    ),
    toClipboard: toClipboardNumber,
    fromClipboard: parseNumeric,
  }
}

export function percentField(
  opts: { locale?: string; maximumFractionDigits?: number } = {},
): FieldType<number> {
  return {
    name: "percent",
    icon: FIELD_ICONS.percent,
    align: "right",
    display: (ctx) => (
      <span className="tabular-nums">{formatPercent(ctx.getValue(), opts)}</span>
    ),
    toClipboard: toClipboardNumber,
    fromClipboard: parseNumeric,
  }
}

export function durationField(
  opts: { unit?: "minutes" | "hms" } = {},
): FieldType<number> {
  return {
    name: "duration",
    icon: FIELD_ICONS.duration,
    align: "right",
    display: (ctx) => (
      <span className="tabular-nums">{formatDuration(ctx.getValue(), opts)}</span>
    ),
    toClipboard: toClipboardNumber,
    fromClipboard: parseNumeric,
  }
}

// Standalone ColumnDef["cell"] factories — display renderers, for any table.
export const numberCell = <TData,>(o?: Parameters<typeof numberField>[0]) =>
  numberField(o).display as (ctx: CellContext<TData, number>) => React.ReactNode
export const currencyCell = <TData,>(o?: Parameters<typeof currencyField>[0]) =>
  currencyField(o).display as (ctx: CellContext<TData, number>) => React.ReactNode
export const percentCell = <TData,>(o?: Parameters<typeof percentField>[0]) =>
  percentField(o).display as (ctx: CellContext<TData, number>) => React.ReactNode
export const durationCell = <TData,>(o?: Parameters<typeof durationField>[0]) =>
  durationField(o).display as (ctx: CellContext<TData, number>) => React.ReactNode
```

Add `import type * as React from "react"` at the top if the `React.ReactNode` annotations require it under the repo's `jsx: react-jsx` setting (they do — include it).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/table-fields/number-fields.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck` (expect clean).

```bash
git add components/table-fields/number-fields.tsx components/table-fields/number-fields.test.tsx
git commit -m "feat(table-fields): add number/currency/percent/duration fields

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Text fields

**Files:**
- Create: `components/table-fields/text-fields.tsx`
- Test: `components/table-fields/text-fields.test.tsx`

Value type is `string`. `text`/`longText` render plain (longText truncates to one line via CSS). `url`/`email`/`phone` render click-through anchors (`target=_blank rel=noreferrer` for url; `mailto:`/`tel:` for email/phone) with the raw string as text. Clipboard is identity (`toClipboard` returns the string, `fromClipboard` returns the text).

- [ ] **Step 1: Write the failing test**

Create `components/table-fields/text-fields.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import type { CellContext } from "@tanstack/react-table"
import { describe, expect, it } from "vitest"
import {
  emailField,
  longTextField,
  phoneField,
  textField,
  urlField,
} from "./text-fields"

function ctx(value: string): CellContext<unknown, string> {
  return { getValue: () => value } as unknown as CellContext<unknown, string>
}

describe("text fields", () => {
  it("textField renders the raw string", () => {
    const { container } = render(<>{textField().display(ctx("hello"))}</>)
    expect(container.textContent).toBe("hello")
  })

  it("longTextField renders text and truncates via class", () => {
    const { container } = render(<>{longTextField().display(ctx("a long note"))}</>)
    expect(container.textContent).toBe("a long note")
    expect(container.querySelector(".truncate")).not.toBeNull()
  })

  it("urlField renders an external anchor", () => {
    render(<>{urlField().display(ctx("https://example.com"))}</>)
    const a = screen.getByRole("link", { name: "https://example.com" })
    expect(a).toHaveAttribute("href", "https://example.com")
    expect(a).toHaveAttribute("target", "_blank")
    expect(a).toHaveAttribute("rel", "noreferrer")
  })

  it("urlField renders non-http(s) values as plain text, not a link", () => {
    const { container } = render(<>{urlField().display(ctx("javascript:alert(1)"))}</>)
    expect(container.querySelector("a")).toBeNull()
    expect(container.textContent).toBe("javascript:alert(1)")
  })

  it("emailField renders a mailto link and phoneField a tel link", () => {
    render(<>{emailField().display(ctx("a@b.com"))}</>)
    expect(screen.getByRole("link", { name: "a@b.com" })).toHaveAttribute("href", "mailto:a@b.com")
    render(<>{phoneField().display(ctx("+15551234567"))}</>)
    expect(screen.getByRole("link", { name: "+15551234567" })).toHaveAttribute("href", "tel:+15551234567")
  })

  it("round-trips clipboard as identity", () => {
    expect(urlField().toClipboard("x")).toBe("x")
    expect(urlField().fromClipboard("x")).toBe("x")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/table-fields/text-fields.test.tsx`
Expected: FAIL — cannot resolve `./text-fields`.

- [ ] **Step 3: Implement `text-fields.tsx`**

Create `components/table-fields/text-fields.tsx`:

```tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/table-fields/text-fields.test.tsx`
Expected: PASS (5 tests). Note: `mailto:`/`tel:` links have an accessible name equal to their text, so `getByRole("link", { name })` resolves.

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck` (expect clean).

```bash
git add components/table-fields/text-fields.tsx components/table-fields/text-fields.test.tsx
git commit -m "feat(table-fields): add text/longText/url/email/phone fields

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Choice fields

**Files:**
- Create: `components/table-fields/choice-fields.tsx`
- Test: `components/table-fields/choice-fields.test.tsx`

`singleSelect` value is `string`; displays the matching option label as a `Badge`. `multiSelect` value is `string[]`; displays one `Badge` per selected label. `checkbox` value is `boolean`; displays a check glyph (`✓`) or nothing. Clipboard: single = the value string; multi = comma-joined values; checkbox = `"true"`/`"false"`.

- [ ] **Step 1: Write the failing test**

Create `components/table-fields/choice-fields.test.tsx`:

```tsx
import { render } from "@testing-library/react"
import type { CellContext } from "@tanstack/react-table"
import { describe, expect, it } from "vitest"
import { checkboxField, multiSelectField, singleSelectField } from "./choice-fields"

const OPTS = [
  { label: "Sales", value: "sales" },
  { label: "Engineering", value: "eng" },
]
function ctx<V>(value: V): CellContext<unknown, V> {
  return { getValue: () => value } as unknown as CellContext<unknown, V>
}

describe("choice fields", () => {
  it("singleSelectField shows the option label", () => {
    const f = singleSelectField({ options: OPTS })
    const { container } = render(<>{f.display(ctx("eng"))}</>)
    expect(container.textContent).toBe("Engineering")
    expect(f.toClipboard("eng")).toBe("eng")
    expect(f.fromClipboard("eng")).toBe("eng")
  })

  it("multiSelectField shows all selected labels and joins clipboard", () => {
    const f = multiSelectField({ options: OPTS })
    const { container } = render(<>{f.display(ctx(["sales", "eng"]))}</>)
    expect(container.textContent).toContain("Sales")
    expect(container.textContent).toContain("Engineering")
    expect(f.toClipboard(["sales", "eng"])).toBe("sales, eng")
    expect(f.fromClipboard("sales, eng")).toEqual(["sales", "eng"])
  })

  it("checkboxField shows a check for true and clipboard booleans", () => {
    const f = checkboxField()
    const { container: on } = render(<>{f.display(ctx(true))}</>)
    expect(on.textContent).toBe("✓")
    const { container: off } = render(<>{f.display(ctx(false))}</>)
    expect(off.textContent).toBe("")
    expect(f.toClipboard(true)).toBe("true")
    expect(f.fromClipboard("true")).toBe(true)
    expect(f.fromClipboard("false")).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/table-fields/choice-fields.test.tsx`
Expected: FAIL — cannot resolve `./choice-fields`.

- [ ] **Step 3: Implement `choice-fields.tsx`**

Create `components/table-fields/choice-fields.tsx`:

```tsx
import type * as React from "react"
import type { CellContext } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"

import { FIELD_ICONS } from "./icons"
import type { FieldType, SelectOption } from "./types"

function labelFor(options: SelectOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value
}

export function singleSelectField(opts: { options: SelectOption[] }): FieldType<string> {
  return {
    name: "singleSelect",
    icon: FIELD_ICONS.singleSelect,
    display: (ctx) => {
      const v = ctx.getValue()
      return v ? <Badge variant="secondary">{labelFor(opts.options, v)}</Badge> : null
    },
    toClipboard: (v) => v ?? "",
    fromClipboard: (t) => t,
  }
}

/**
 * Clipboard format is a human-readable, Excel-pasteable comma-joined list
 * (matching Airtable). Consequence: option `value`s must not contain a comma,
 * or the copy/paste round-trip splits them apart. Keep values comma-free
 * (labels may contain commas; only the serialized `value` is affected).
 */
export function multiSelectField(opts: { options: SelectOption[] }): FieldType<string[]> {
  return {
    name: "multiSelect",
    icon: FIELD_ICONS.multiSelect,
    display: (ctx) => {
      const values = ctx.getValue() ?? []
      return (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary">
              {labelFor(opts.options, v)}
            </Badge>
          ))}
        </div>
      )
    },
    toClipboard: (values) => (values ?? []).join(", "),
    fromClipboard: (t) =>
      t
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
  }
}

export function checkboxField(): FieldType<boolean> {
  return {
    name: "checkbox",
    icon: FIELD_ICONS.checkbox,
    align: "center",
    display: (ctx) => (ctx.getValue() ? <span aria-label="checked">✓</span> : null),
    toClipboard: (v) => (v ? "true" : "false"),
    fromClipboard: (t) => t.trim().toLowerCase() === "true",
  }
}

export const singleSelectCell = <TData,>(o: { options: SelectOption[] }) =>
  singleSelectField(o).display as (ctx: CellContext<TData, string>) => React.ReactNode
export const multiSelectCell = <TData,>(o: { options: SelectOption[] }) =>
  multiSelectField(o).display as (ctx: CellContext<TData, string[]>) => React.ReactNode
export const checkboxCell = <TData,>() =>
  checkboxField().display as (ctx: CellContext<TData, boolean>) => React.ReactNode
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/table-fields/choice-fields.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck` (expect clean).

```bash
git add components/table-fields/choice-fields.tsx components/table-fields/choice-fields.test.tsx
git commit -m "feat(table-fields): add singleSelect/multiSelect/checkbox fields

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Widget fields

**Files:**
- Create: `components/table-fields/widget-fields.tsx`
- Test: `components/table-fields/widget-fields.test.tsx`

`rating` value is `number` (0..max, default max 5); displays filled/empty stars. `button` value is unused for display; renders a shadcn `Button` calling a supplied `onClick(row)` — takes the row via `ctx.row.original`. `date` value is a `Date | string` (ISO); displays a locale date, optionally with time. Clipboard: rating = number string; button = empty; date = ISO string.

- [ ] **Step 1: Write the failing test**

Create `components/table-fields/widget-fields.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import type { CellContext } from "@tanstack/react-table"
import { describe, expect, it, vi } from "vitest"
import { buttonField, dateField, ratingField } from "./widget-fields"

function ctx<V>(value: V, original: unknown = {}): CellContext<unknown, V> {
  return { getValue: () => value, row: { original } } as unknown as CellContext<unknown, V>
}

describe("widget fields", () => {
  it("ratingField renders max stars with N filled", () => {
    const { container } = render(<>{ratingField({ max: 5 }).display(ctx(3))}</>)
    expect(container.querySelectorAll('[data-star]')).toHaveLength(5)
    expect(container.querySelectorAll('[data-star="filled"]')).toHaveLength(3)
  })

  it("buttonField renders a button that calls onClick with the row", () => {
    const onClick = vi.fn()
    render(<>{buttonField({ label: "Open", onClick }).display(ctx(null, { id: "r1" }))}</>)
    fireEvent.click(screen.getByRole("button", { name: "Open" }))
    expect(onClick).toHaveBeenCalledWith({ id: "r1" })
  })

  it("dateField displays a locale date and round-trips ISO", () => {
    const f = dateField()
    const { container } = render(<>{f.display(ctx("2026-07-11"))}</>)
    expect(container.textContent).toContain("2026")
    expect(f.toClipboard("2026-07-11")).toBe("2026-07-11")
    expect(f.fromClipboard("2026-07-11")).toBe("2026-07-11")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/table-fields/widget-fields.test.tsx`
Expected: FAIL — cannot resolve `./widget-fields`.

- [ ] **Step 3: Implement `widget-fields.tsx`**

Create `components/table-fields/widget-fields.tsx`:

```tsx
import type * as React from "react"
import type { CellContext } from "@tanstack/react-table"
import { Star } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { FIELD_ICONS } from "./icons"
import type { FieldType } from "./types"

export function ratingField(opts: { max?: number } = {}): FieldType<number> {
  const max = opts.max ?? 5
  return {
    name: "rating",
    icon: FIELD_ICONS.rating,
    display: (ctx) => {
      const value = ctx.getValue() ?? 0
      return (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: max }, (_, i) => {
            const filled = i < value
            return (
              <Star
                key={i}
                data-star={filled ? "filled" : "empty"}
                className={cn(
                  "size-4",
                  filled ? "fill-current text-amber-500" : "text-muted-foreground/40",
                )}
              />
            )
          })}
        </div>
      )
    },
    toClipboard: (v) => (v == null ? "" : String(v)),
    fromClipboard: (t) => {
      const n = Number(t)
      return Number.isNaN(n) ? undefined : n
    },
  }
}

export function buttonField<TData = unknown>(opts: {
  label: string
  onClick: (row: TData) => void
}): FieldType<unknown> {
  return {
    name: "button",
    icon: FIELD_ICONS.button,
    display: (ctx) => (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          opts.onClick(ctx.row.original as TData)
        }}
      >
        {opts.label}
      </Button>
    ),
    toClipboard: () => "",
    fromClipboard: () => undefined,
  }
}

function toDate(value: Date | string): Date | undefined {
  if (value == null) return undefined
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function dateField(
  opts: { withTime?: boolean; locale?: string } = {},
): FieldType<Date | string> {
  return {
    name: "date",
    icon: FIELD_ICONS.date,
    display: (ctx) => {
      const d = toDate(ctx.getValue())
      if (!d) return null
      return (
        <span>
          {new Intl.DateTimeFormat(opts.locale ?? "en-US", {
            dateStyle: "medium",
            ...(opts.withTime ? { timeStyle: "short" } : {}),
          }).format(d)}
        </span>
      )
    },
    // Round-trips as an ISO date (yyyy-mm-dd) or full ISO when time is present.
    toClipboard: (v) => {
      const d = toDate(v)
      if (!d) return ""
      return opts.withTime ? d.toISOString() : d.toISOString().slice(0, 10)
    },
    fromClipboard: (t) => (toDate(t) ? t : undefined),
  }
}

export const ratingCell = <TData,>(o?: { max?: number }) =>
  ratingField(o).display as (ctx: CellContext<TData, number>) => React.ReactNode
export const buttonCell = <TData,>(o: { label: string; onClick: (row: TData) => void }) =>
  buttonField<TData>(o).display as (ctx: CellContext<TData, unknown>) => React.ReactNode
export const dateCell = <TData,>(o?: { withTime?: boolean; locale?: string }) =>
  dateField(o).display as (ctx: CellContext<TData, Date | string>) => React.ReactNode
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/table-fields/widget-fields.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck` (expect clean).

```bash
git add components/table-fields/widget-fields.tsx components/table-fields/widget-fields.test.tsx
git commit -m "feat(table-fields): add rating/button/date fields

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Barrel export

**Files:**
- Create: `components/table-fields/index.ts`
- Test: `components/table-fields/index.test.ts`

- [ ] **Step 1: Write the failing test**

Create `components/table-fields/index.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import * as fields from "./index"

describe("table-fields barrel", () => {
  it("re-exports every field factory and standalone cell", () => {
    for (const name of [
      "numberField", "currencyField", "percentField", "durationField",
      "textField", "longTextField", "urlField", "emailField", "phoneField",
      "singleSelectField", "multiSelectField", "checkboxField",
      "ratingField", "buttonField", "dateField",
      "currencyCell", "urlCell", "singleSelectCell", "ratingCell",
      "formatCurrency", "FIELD_ICONS",
    ]) {
      expect(fields).toHaveProperty(name)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/table-fields/index.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Implement `index.ts`**

Create `components/table-fields/index.ts`:

```ts
export type {
  FieldType,
  FieldEditContext,
  SelectOption,
  EditableTableMeta,
} from "./types"
export {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDuration,
} from "./format"
export { FIELD_ICONS } from "./icons"
export {
  numberField, currencyField, percentField, durationField,
  numberCell, currencyCell, percentCell, durationCell,
} from "./number-fields"
export {
  textField, longTextField, urlField, emailField, phoneField,
  textCell, longTextCell, urlCell, emailCell, phoneCell,
} from "./text-fields"
export {
  singleSelectField, multiSelectField, checkboxField,
  singleSelectCell, multiSelectCell, checkboxCell,
} from "./choice-fields"
export {
  ratingField, buttonField, dateField,
  ratingCell, buttonCell, dateCell,
} from "./widget-fields"
```

- [ ] **Step 4: Run the full suite + typecheck**

Run: `pnpm exec vitest run components/table-fields/` — Expected: all field tests PASS.
Run: `pnpm typecheck` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/table-fields/index.ts components/table-fields/index.test.ts
git commit -m "feat(table-fields): add barrel export

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Registry item + build

**Files:**
- Modify: `registry.json` (repo root)
- Rebuild: `public/r/table-fields.json`, `public/r/registry.json`

- [ ] **Step 1: Add the `table-fields` item to `registry.json`**

Add a new object to the top-level `items` array (a `registry:lib` block; deps: `@tanstack/react-table`, `lucide-react`; registryDependencies: `badge`, `button`):

```json
    {
      "name": "table-fields",
      "type": "registry:lib",
      "title": "Table Fields",
      "description": "Standalone, type-safe Airtable-style field types (number, currency, percent, duration, text, url, email, phone, single/multi select, checkbox, rating, button, date) for any shadcn + TanStack Table. Display renderers, Intl formatters, header icons, and clipboard serialization.",
      "dependencies": ["@tanstack/react-table", "lucide-react"],
      "registryDependencies": ["badge", "button"],
      "files": [
        { "path": "components/table-fields/types.ts", "type": "registry:lib", "target": "components/table-fields/types.ts" },
        { "path": "components/table-fields/format.ts", "type": "registry:lib", "target": "components/table-fields/format.ts" },
        { "path": "components/table-fields/icons.ts", "type": "registry:lib", "target": "components/table-fields/icons.ts" },
        { "path": "components/table-fields/number-fields.tsx", "type": "registry:component", "target": "components/table-fields/number-fields.tsx" },
        { "path": "components/table-fields/text-fields.tsx", "type": "registry:component", "target": "components/table-fields/text-fields.tsx" },
        { "path": "components/table-fields/choice-fields.tsx", "type": "registry:component", "target": "components/table-fields/choice-fields.tsx" },
        { "path": "components/table-fields/widget-fields.tsx", "type": "registry:component", "target": "components/table-fields/widget-fields.tsx" },
        { "path": "components/table-fields/index.ts", "type": "registry:lib", "target": "components/table-fields/index.ts" }
      ]
    }
```

Note: `*.test.*` files are intentionally NOT listed (tests aren't distributed).

- [ ] **Step 2: Validate JSON + build**

Run: `node -e "require('./registry.json')"` — Expected: no throw.
Run: `pnpm registry:build` — Expected: writes `public/r/table-fields.json` + updates `public/r/registry.json`, no error.

- [ ] **Step 3: Verify the built item ships the 8 files (no tests)**

Run:
```bash
node -e "const j=require('./public/r/table-fields.json'); console.log(j.files.length, j.files.every(f=>!f.path.includes('.test.')))"
```
Expected output: `8 true`

- [ ] **Step 4: Commit**

```bash
git add registry.json public/r/
git commit -m "feat(table-fields): publish table-fields registry item

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Final verification

- [ ] **Step 1: Full suite**

Run: `pnpm test` — Expected: all suites pass (existing grouped-data-table suites + new table-fields suites).

- [ ] **Step 2: Typecheck + production build**

Run: `pnpm typecheck && pnpm build` — Expected: clean typecheck; Next build compiles all routes (table-fields is a library, not a route, but must not break the build).

- [ ] **Step 3: (Optional) scratch-install smoke test**

In a throwaway shadcn project, `npx shadcn@latest add <abs path>/public/r/table-fields.json` then `npx tsc --noEmit` — confirms the item installs and typechecks standalone. Defer to the Plan-2 verification if time-boxed.

---

## Self-Review notes (already applied)

- **Spec coverage:** Families 1–4 (~15 fields) ✓; standalone cell factories ✓; header icons ✓; Intl formatters incl. duration-default-minutes ✓; clipboard serialize/parse ✓ (used by copy/export in Plan 2); `FieldType`/`FieldEditContext` contract ✓ (edit renderer intentionally deferred to Plan 2 — see Goal). Row selection, columns control, footer calc, hybrid aggregation, undo/redo, grid spine, typed `defineColumns` builder are all **Plan 2** and out of scope here.
- **Type consistency:** `FieldType<V>` shape is identical across all field files; `toClipboard`/`fromClipboard` present on every field; cell factories are `field.display`; value types are `number` (numeric+rating), `string` (text family + singleSelect), `string[]` (multiSelect), `boolean` (checkbox), `Date | string` (date), `unknown` (button).
- **No placeholders:** every step has complete code and exact commands.
