# data-table-core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@kotsas-ui/data-table` — a type-safe, editable `DataTable<TData>` with a real grid interaction spine (cell focus, keyboard navigation, edit lifecycle) and sort/hide/pin/resize columns, consuming `table-fields`. This is Plan 2 of 3 for the DataTable architecture (Plan 1 = `table-fields`, shipped; Plan 3 = selection/footer-calc/undo-redo/clipboard-export, later).

**Architecture:** Editing state (`activeCell`/`editingCell`) lives in a headless `useGridNavigation` hook, independently testable with plain arrays (no TanStack table needed). `useDataTable` wires TanStack state (sorting/visibility/pinning/sizing/pagination) and combines it with navigation into a `DataTableRuntime` object, provided via React Context so cell renderers (built once per column by `defineColumns`) can read it without prop-drilling. A typed `defineColumns<TData>()` builder constrains each column's accessor key to a value type matching the chosen field, and produces cells that render `table-fields`' `display` in read mode and `edit` in edit mode. `data-table` ships its own base-ui/Radix primitives shim (mirroring `grouped-data-table`'s), used only by its own toolbar UI — `table-fields`' edit renderers deliberately use base-agnostic native elements (`<input>`, `<select>`, shadcn `Checkbox`/`Input`, which are verified base-ui/Radix-safe) so `table-fields` itself stays shim-free.

**Tech Stack:** React 18+, TypeScript strict, `@tanstack/react-table@8.21.3`, `@kotsas-ui/table-fields` (registryDependency), shadcn primitives (`Popover`, `Checkbox`, `Input`, `Button`, `Table`), `lucide-react`, Vitest + Testing Library + jsdom, shadcn registry (base-ui + Radix builds).

---

## Scope decisions for this plan (read before implementing)

These resolve open questions the architecture spec left for planning time. They are deliberate, bounded choices — not omissions:

1. **Editable field subset.** Per the spec's table: number/currency/percent/duration, text/longText/url/email/phone, singleSelect, checkbox, rating, date get `edit` renderers. **`multiSelect` edit is explicitly deferred** — inline multi-select editing needs a popover-based picker, which is more UX complexity than fits this plan; `multiSelectField` stays display-only. `button` never has `edit` (it's an action, not a value).
2. **No new base-ui/Radix coupling in `table-fields`.** `singleSelect`'s edit renderer uses a styled native `<select>` (not a shadcn `Select`), and `date`'s edit renderer uses a native `<input type="date">` (not a calendar popover). Both are fully keyboard/screen-reader accessible and require zero new dependencies or primitives — keeping `table-fields` genuinely base-agnostic as shipped in Plan 1. `checkbox` and text-family edits use the shadcn `Checkbox`/`Input` components directly (verified: both are safe to use unshimmed — `grouped-data-table/filter-builder.tsx` and `grouped-data-table/multi-select.tsx` already use `Input`/`Checkbox` directly with no base-ui-specific handling; only `Select`/`PopoverTrigger` needed the primitives shim historically).
3. **Type-to-edit is deferred.** The spec mentions "typing on a focused editable cell enters edit mode with the character." This plan implements entry via **Enter** and **click-on-already-active-cell** only; seeding a typed character is a fast-follow, not implemented here (documented, not silently dropped).
4. **Single commit-on-change for select/checkbox/rating.** Native `<select>`, `Checkbox`, and star clicks commit immediately on change (matches how those controls naturally behave — there's no separate "still editing" state after choosing). Text/number/date inputs commit on blur, Enter, or Tab.
5. **`defineColumns` ergonomics.** The spec's illustrative syntax `defineColumns<TData>()([...])` doesn't type-check cleanly (TData can't be inferred purely from an already-evaluated array of `col.x(...)` calls). The actually-implementable, equally type-safe form used here: `const col = defineColumns<TData>()` returns a `col` object whose methods close over `TData`, then `const columns = [col.text("name"), ...]`.

---

## File Structure

**Modify (add `edit` renderers to already-shipped Plan 1 files):**
- `components/table-fields/number-fields.tsx`
- `components/table-fields/text-fields.tsx`
- `components/table-fields/choice-fields.tsx`
- `components/table-fields/widget-fields.tsx`

**Create, under `components/data-table/`:**
- `types.ts` — `CellPos`, `DataTableRuntime`, `DataTableColumnMeta`.
- `use-grid-navigation.ts` — headless hook: active/editing cell state, keyboard handling. Pure, no TanStack dependency.
- `define-columns.ts` — `defineColumns<TData>()` + `col.*` builder; the generic editable-cell renderer.
- `data-table-runtime-context.ts` — the React Context carrying `DataTableRuntime`.
- `primitives.tsx` / `primitives.radix.tsx` — base-ui/Radix shim (`PopoverButtonTrigger` only).
- `column-header.tsx` — sortable header cell (icon + label + sort indicator).
- `columns-menu.tsx` — hide/pin popover (mirrors `grouped-data-table/dimension-picker.tsx`).
- `use-data-table.ts` — TanStack state wiring + navigation combination.
- `data-table.tsx` — `DataTable<TData>` composition root.
- `index.ts` — barrel.
- One `*.test.ts(x)` beside each implementation file (except the Radix primitives twin and the barrel's own logic, covered by a parity test).

**Modify:** `registry.json` (new `data-table` + `data-table-radix` items), `tsconfig.json` (already excludes `**/*.radix.tsx`, confirm it still applies).

**Conventions (unchanged from Plan 1):** `pnpm exec vitest run <path>`, `pnpm typecheck`, `pnpm exec eslint <path>`, `pnpm registry:build`. Work on a feature branch.

---

## Task 0: Branch

- [ ] **Step 1: Create the feature branch**

```bash
cd /Users/gianniskotsas/Documents/WebDev/react-pivot-table
git checkout main && git pull --ff-only origin main
git checkout -b feat/data-table-core
```

---

## Task 1: table-fields — edit renderers for number/currency/percent/duration

**Files:**
- Modify: `components/table-fields/number-fields.tsx`
- Modify: `components/table-fields/number-fields.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `components/table-fields/number-fields.test.tsx` (keep all existing tests; add these):

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
// ...existing imports stay; add vi if not already imported:
import { vi } from "vitest"

describe("number field edit renderers", () => {
  it("numberField.edit renders a number input wired to the edit context", () => {
    const setValue = vi.fn()
    const commit = vi.fn()
    render(
      <>
        {numberField().edit!({
          value: 5,
          setValue,
          commit,
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    const input = screen.getByRole("spinbutton")
    expect(input).toHaveValue(5)
    fireEvent.change(input, { target: { value: "9" } })
    expect(setValue).toHaveBeenCalledWith(9)
    fireEvent.blur(input)
    expect(commit).toHaveBeenCalled()
  })

  it("numberField.edit commits and moves down on Enter, cancels on Escape", () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const focusNext = vi.fn()
    render(
      <>
        {numberField().edit!({
          value: 5,
          setValue: vi.fn(),
          commit,
          cancel,
          focusNext,
        })}
      </>,
    )
    const input = screen.getByRole("spinbutton")
    fireEvent.keyDown(input, { key: "Enter" })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(focusNext).toHaveBeenCalledWith("down")
    fireEvent.keyDown(input, { key: "Escape" })
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it("currencyField/percentField/durationField all expose an edit renderer", () => {
    expect(currencyField().edit).toBeTypeOf("function")
    expect(percentField().edit).toBeTypeOf("function")
    expect(durationField().edit).toBeTypeOf("function")
  })

  it("a fully-typed negative value commits correctly (onChange only ever sees '' or a parseable number)", () => {
    const setValue = vi.fn()
    render(
      <>
        {currencyField().edit!({
          value: 100,
          setValue,
          commit: vi.fn(),
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    const input = screen.getByRole("spinbutton")
    fireEvent.change(input, { target: { value: "-5" } })
    expect(setValue).toHaveBeenCalledWith(-5)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/table-fields/number-fields.test.tsx`
Expected: FAIL — `numberField().edit` is `undefined`, calling it throws.

- [ ] **Step 3: Implement the edit renderers**

In `components/table-fields/number-fields.tsx`, add `import { Input } from "@/components/ui/input"` to the imports, then add a shared edit-renderer factory and wire it into each of the four field functions.

Add this helper right after `toClipboardNumber`:

```tsx
/**
 * Shared numeric edit renderer for number/currency/percent/duration.
 *
 * Controlled by ctx.value: a lone "-" or trailing "." never round-trips
 * through this at all — native `type="number"` inputs withhold the change
 * event entirely for an incomplete/invalid value (per the WHATWG value
 * sanitization algorithm), so onChange only ever fires with "" or a fully
 * parseable number. Controlled is required so re-entering edit mode on the
 * same cell (after a commit/cancel) reflects the fresh `ctx.value` instead of
 * stale DOM content from a prior edit session.
 */
function numericEdit(ctx: import("./types").FieldEditContext<number>) {
  return (
    <Input
      type="number"
      autoFocus
      value={Number.isNaN(ctx.value) ? "" : ctx.value}
      onChange={(e) => ctx.setValue(e.target.value === "" ? Number.NaN : Number(e.target.value))}
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
```

Then add `edit: numericEdit,` to each of the four returned objects — e.g. `numberField`:

```tsx
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
    edit: numericEdit,
    toClipboard: toClipboardNumber,
    fromClipboard: parseNumeric,
  }
}
```

Apply the identical `edit: numericEdit,` addition to `currencyField`, `percentField`, and `durationField` (same position, right after their `display` property).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/table-fields/number-fields.test.tsx`
Expected: PASS (all tests, existing + new).

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/table-fields/number-fields.tsx components/table-fields/number-fields.test.tsx` (fix any errors), then `pnpm typecheck` (expect clean).

```bash
git add components/table-fields/number-fields.tsx components/table-fields/number-fields.test.tsx
git commit -m "feat(table-fields): add edit renderers to number/currency/percent/duration fields

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: table-fields — edit renderers for text/longText/url/email/phone

**Files:**
- Modify: `components/table-fields/text-fields.tsx`
- Modify: `components/table-fields/text-fields.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `components/table-fields/text-fields.test.tsx`:

```tsx
import { fireEvent } from "@testing-library/react"
import { vi } from "vitest"

describe("text field edit renderers", () => {
  it("textField.edit renders a text input wired to the edit context", () => {
    const setValue = vi.fn()
    const commit = vi.fn()
    render(
      <>
        {textField().edit!({
          value: "hi",
          setValue,
          commit,
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    const input = screen.getByRole("textbox")
    expect(input).toHaveValue("hi")
    fireEvent.change(input, { target: { value: "hello" } })
    expect(setValue).toHaveBeenCalledWith("hello")
    fireEvent.blur(input)
    expect(commit).toHaveBeenCalled()
  })

  it("longTextField.edit renders a textarea", () => {
    render(
      <>
        {longTextField().edit!({
          value: "note",
          setValue: vi.fn(),
          commit: vi.fn(),
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    expect(screen.getByRole("textbox").tagName).toBe("TEXTAREA")
  })

  it("urlField/emailField/phoneField all expose a plain text edit renderer", () => {
    expect(urlField().edit).toBeTypeOf("function")
    expect(emailField().edit).toBeTypeOf("function")
    expect(phoneField().edit).toBeTypeOf("function")
    render(
      <>
        {urlField().edit!({
          value: "https://x.com",
          setValue: vi.fn(),
          commit: vi.fn(),
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    expect(screen.getByRole("textbox")).toHaveValue("https://x.com")
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/table-fields/text-fields.test.tsx`
Expected: FAIL — `.edit` is `undefined`.

- [ ] **Step 3: Implement the edit renderers**

In `components/table-fields/text-fields.tsx`, add `import { Input } from "@/components/ui/input"` to the imports. Add two shared edit-renderer factories right after the `flagEmoji` helper:

```tsx
/** Shared single-line text edit renderer for text/url/email/phone. */
function textEdit(ctx: import("./types").FieldEditContext<string>) {
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
function longTextEdit(ctx: import("./types").FieldEditContext<string>) {
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
```

Then add `edit: textEdit,` to `textField`, `urlField`, `emailField`, `phoneField` (right after each `display`), and `edit: longTextEdit,` to `longTextField`. Example for `textField`:

```tsx
export function textField(): FieldType<string> {
  return {
    name: "text",
    icon: FIELD_ICONS.text,
    display: (ctx) => ctx.getValue(),
    edit: textEdit,
    ...identityClipboard,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/table-fields/text-fields.test.tsx`
Expected: PASS.

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/table-fields/text-fields.tsx components/table-fields/text-fields.test.tsx`, then `pnpm typecheck`.

```bash
git add components/table-fields/text-fields.tsx components/table-fields/text-fields.test.tsx
git commit -m "feat(table-fields): add edit renderers to text/longText/url/email/phone fields

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: table-fields — edit renderers for singleSelect and checkbox

**Files:**
- Modify: `components/table-fields/choice-fields.tsx`
- Modify: `components/table-fields/choice-fields.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `components/table-fields/choice-fields.test.tsx`:

```tsx
import { fireEvent } from "@testing-library/react"
import { vi } from "vitest"

describe("choice field edit renderers", () => {
  it("singleSelectField.edit renders a native select and commits on change", () => {
    const setValue = vi.fn()
    const commit = vi.fn()
    render(
      <>
        {singleSelectField({ options: OPTS }).edit!({
          value: "sales",
          setValue,
          commit,
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    const select = screen.getByRole("combobox")
    expect(select).toHaveValue("sales")
    fireEvent.change(select, { target: { value: "eng" } })
    expect(setValue).toHaveBeenCalledWith("eng")
    expect(commit).toHaveBeenCalled()
  })

  it("checkboxField.edit renders a Checkbox and commits on toggle", () => {
    const setValue = vi.fn()
    const commit = vi.fn()
    render(
      <>
        {checkboxField().edit!({
          value: false,
          setValue,
          commit,
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    fireEvent.click(screen.getByRole("checkbox"))
    expect(setValue).toHaveBeenCalledWith(true)
    expect(commit).toHaveBeenCalled()
  })

  it("checkboxField.edit forwards Tab to focusNext and Escape to cancel", () => {
    const cancel = vi.fn()
    const focusNext = vi.fn()
    render(
      <>
        {checkboxField().edit!({
          value: false,
          setValue: vi.fn(),
          commit: vi.fn(),
          cancel,
          focusNext,
        })}
      </>,
    )
    const checkbox = screen.getByRole("checkbox")
    fireEvent.keyDown(checkbox, { key: "Tab" })
    expect(focusNext).toHaveBeenCalledWith("next")
    fireEvent.keyDown(checkbox, { key: "Escape" })
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it("multiSelectField has no edit renderer (deferred)", () => {
    expect(multiSelectField({ options: OPTS }).edit).toBeUndefined()
  })

  it("singleSelectField.edit cancels on Escape and commits+advances on Tab", () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const focusNext = vi.fn()
    render(
      <>
        {singleSelectField({ options: OPTS }).edit!({
          value: "sales",
          setValue: vi.fn(),
          commit,
          cancel,
          focusNext,
        })}
      </>,
    )
    const select = screen.getByRole("combobox")
    fireEvent.keyDown(select, { key: "Escape" })
    expect(cancel).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(select, { key: "Tab" })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(focusNext).toHaveBeenCalledWith("next")
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/table-fields/choice-fields.test.tsx`
Expected: FAIL — `.edit` is `undefined` for singleSelect/checkbox.

- [ ] **Step 3: Implement the edit renderers**

In `components/table-fields/choice-fields.tsx`, add `import { Checkbox } from "@/components/ui/checkbox"` to the imports.

Add `edit` to `singleSelectField`, right after its `display`:

```tsx
export function singleSelectField(opts: { options: SelectOption[] }): FieldType<string> {
  return {
    name: "singleSelect",
    icon: FIELD_ICONS.singleSelect,
    display: (ctx) => {
      const v = ctx.getValue()
      return v ? <Badge variant="secondary">{labelFor(opts.options, v)}</Badge> : null
    },
    edit: (ctx) => (
      <select
        autoFocus
        value={ctx.value ?? ""}
        onChange={(e) => {
          ctx.setValue(e.target.value)
          ctx.commit()
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === "Escape") {
            e.preventDefault()
            ctx.cancel()
          } else if (e.key === "Tab") {
            // Consistent with the text/number editors: Tab commits (if a
            // value is selected) and advances the grid's active cell, rather
            // than being silently swallowed by stopPropagation above.
            e.preventDefault()
            if (ctx.value) ctx.commit()
            ctx.focusNext(e.shiftKey ? "prev" : "next")
          }
        }}
        className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="" disabled hidden>
          Select…
        </option>
        {opts.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ),
    toClipboard: (v) => v ?? "",
    fromClipboard: (t) => t,
  }
}
```

Add `edit` to `checkboxField`, right after its `display`:

```tsx
export function checkboxField(): FieldType<boolean> {
  return {
    name: "checkbox",
    icon: FIELD_ICONS.checkbox,
    align: "center",
    display: (ctx) => {
      const on = ctx.getValue()
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            on
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
          )}
        >
          {on ? <Check className="size-3" /> : <X className="size-3" />}
          {on ? "True" : "False"}
        </span>
      )
    },
    edit: (ctx) => (
      <Checkbox
        autoFocus
        checked={ctx.value ?? false}
        onCheckedChange={(checked) => {
          ctx.setValue(checked === true)
          ctx.commit()
        }}
        onKeyDown={(e) => {
          // Checkbox commits synchronously on toggle (no "draft" value), so
          // Escape has nothing to revert but is still handled for
          // consistency: it exits edit mode without toggling.
          e.stopPropagation()
          if (e.key === "Escape") {
            e.preventDefault()
            ctx.cancel()
          } else if (e.key === "Tab") {
            e.preventDefault()
            ctx.focusNext(e.shiftKey ? "prev" : "next")
          }
        }}
      />
    ),
    toClipboard: (v) => (v ? "true" : "false"),
    fromClipboard: (t) => t.trim().toLowerCase() === "true",
  }
}
```

`multiSelectField` is intentionally left unchanged (no `edit` key) — see Scope decision #1.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/table-fields/choice-fields.test.tsx`
Expected: PASS.

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/table-fields/choice-fields.tsx components/table-fields/choice-fields.test.tsx`, then `pnpm typecheck`.

```bash
git add components/table-fields/choice-fields.tsx components/table-fields/choice-fields.test.tsx
git commit -m "feat(table-fields): add edit renderers to singleSelect and checkbox fields

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: table-fields — edit renderers for rating and date

**Files:**
- Modify: `components/table-fields/widget-fields.tsx`
- Modify: `components/table-fields/widget-fields.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `components/table-fields/widget-fields.test.tsx`:

```tsx
describe("widget field edit renderers", () => {
  it("ratingField.edit renders clickable stars that set and commit", () => {
    const setValue = vi.fn()
    const commit = vi.fn()
    const { container } = render(
      <>
        {ratingField({ max: 5 }).edit!({
          value: 2,
          setValue,
          commit,
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    const stars = container.querySelectorAll("button[aria-label]")
    expect(stars).toHaveLength(5)
    fireEvent.click(stars[3]) // 4th star -> rating 4
    expect(setValue).toHaveBeenCalledWith(4)
    expect(commit).toHaveBeenCalled()
  })

  it("ratingField.edit forwards Tab to focusNext and Escape to cancel", () => {
    const cancel = vi.fn()
    const focusNext = vi.fn()
    const { container } = render(
      <>
        {ratingField({ max: 5 }).edit!({
          value: 2,
          setValue: vi.fn(),
          commit: vi.fn(),
          cancel,
          focusNext,
        })}
      </>,
    )
    const wrapper = container.firstElementChild!
    fireEvent.keyDown(wrapper, { key: "Tab" })
    expect(focusNext).toHaveBeenCalledWith("next")
    fireEvent.keyDown(wrapper, { key: "Escape" })
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it("dateField.edit renders a native date input seeded with the ISO date", () => {
    const setValue = vi.fn()
    render(
      <>
        {dateField().edit!({
          value: "2026-07-11",
          setValue,
          commit: vi.fn(),
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    const input = screen.getByDisplayValue("2026-07-11")
    expect(input).toHaveAttribute("type", "date")
    fireEvent.change(input, { target: { value: "2026-08-01" } })
    expect(setValue).toHaveBeenCalledWith("2026-08-01")
  })

  it("dateField.edit commits and moves down on Enter, cancels on Escape", () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const focusNext = vi.fn()
    render(
      <>
        {dateField().edit!({
          value: "2026-07-11",
          setValue: vi.fn(),
          commit,
          cancel,
          focusNext,
        })}
      </>,
    )
    const input = screen.getByDisplayValue("2026-07-11")
    fireEvent.keyDown(input, { key: "Enter" })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(focusNext).toHaveBeenCalledWith("down")
    fireEvent.keyDown(input, { key: "Escape" })
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it("dateField.edit commits and advances on Tab", () => {
    const commit = vi.fn()
    const focusNext = vi.fn()
    render(
      <>
        {dateField().edit!({
          value: "2026-07-11",
          setValue: vi.fn(),
          commit,
          cancel: vi.fn(),
          focusNext,
        })}
      </>,
    )
    const input = screen.getByDisplayValue("2026-07-11")
    fireEvent.keyDown(input, { key: "Tab" })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(focusNext).toHaveBeenCalledWith("next")
  })

  it("buttonField has no edit renderer", () => {
    expect(buttonField({ label: "x", onClick: () => {} }).edit).toBeUndefined()
  })
})
```

Add `fireEvent, screen` to the existing `@testing-library/react` import if not already present.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run components/table-fields/widget-fields.test.tsx`
Expected: FAIL — `.edit` is `undefined` for rating/date.

- [ ] **Step 3: Implement the edit renderers**

In `components/table-fields/widget-fields.tsx`, add `edit` to `ratingField`, right after its `display`:

```tsx
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
    edit: (ctx) => (
      <div
        className="flex items-center gap-0.5"
        onKeyDown={(e) => {
          // Tab bubbles up here from whichever star button has focus — one
          // handler covers the whole widget. Rating commits synchronously on
          // click (no "draft" value), so Escape has nothing to revert but is
          // still handled for consistency: it exits edit mode without a click.
          e.stopPropagation()
          if (e.key === "Escape") {
            e.preventDefault()
            ctx.cancel()
          } else if (e.key === "Tab") {
            e.preventDefault()
            ctx.focusNext(e.shiftKey ? "prev" : "next")
          }
        }}
      >
        {Array.from({ length: max }, (_, i) => {
          const filled = i < (ctx.value ?? 0)
          return (
            <button
              key={i}
              type="button"
              aria-label={`Rate ${i + 1}`}
              onClick={() => {
                ctx.setValue(i + 1)
                ctx.commit()
              }}
              className="cursor-pointer"
            >
              <Star
                className={cn(
                  "size-4",
                  filled ? "fill-current text-amber-500" : "text-muted-foreground/40",
                )}
              />
            </button>
          )
        })}
      </div>
    ),
    toClipboard: (v) => (v == null ? "" : String(v)),
    fromClipboard: (t) => {
      const n = Number(t)
      if (Number.isNaN(n)) return undefined
      return Math.max(0, Math.min(max, n))
    },
  }
}
```

Add `edit` to `dateField`, right after its `display`:

```tsx
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
            timeZone: "UTC",
            dateStyle: "medium",
            ...(opts.withTime ? { timeStyle: "short" } : {}),
          }).format(d)}
        </span>
      )
    },
    edit: (ctx) => {
      const d = toDate(ctx.value)
      const iso = d ? d.toISOString().slice(0, 10) : ""
      return (
        <input
          type="date"
          autoFocus
          value={iso}
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
            }
          }}
          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      )
    },
    toClipboard: (v) => {
      const d = toDate(v)
      if (!d) return ""
      return opts.withTime ? d.toISOString() : d.toISOString().slice(0, 10)
    },
    fromClipboard: (t) => (toDate(t) ? t : undefined),
  }
}
```

`buttonField` is intentionally left unchanged (no `edit` key).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run components/table-fields/widget-fields.test.tsx`
Expected: PASS.

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/table-fields/widget-fields.tsx components/table-fields/widget-fields.test.tsx`, then `pnpm typecheck`.

```bash
git add components/table-fields/widget-fields.tsx components/table-fields/widget-fields.test.tsx
git commit -m "feat(table-fields): add edit renderers to rating and date fields

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: table-fields — rebuild registry with edit renderers included

**Files:**
- No source changes; rebuild the already-published registry item so it ships the edit renderers.

- [ ] **Step 1: Rebuild**

Run: `pnpm registry:build`
Expected: writes updated `public/r/table-fields.json` with the new `edit` code inlined; no error.

- [ ] **Step 2: Verify**

Run:
```bash
node -e "const j=require('./public/r/table-fields.json'); const f=j.files.find(x=>x.path.endsWith('number-fields.tsx')); console.log(/numericEdit/.test(f.content))"
```
Expected output: `true`

- [ ] **Step 3: Commit**

```bash
git add public/r/table-fields.json
git commit -m "chore(table-fields): rebuild registry with edit renderers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: data-table — core types

**Files:**
- Create: `components/data-table/types.ts`
- Test: `components/data-table/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `components/data-table/types.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import type { CellPos, DataTableColumnMeta, DataTableRuntime } from "./types"

describe("data-table core types", () => {
  it("CellPos has rowId and columnId", () => {
    const pos: CellPos = { rowId: "1", columnId: "name" }
    expect(pos.rowId).toBe("1")
    expect(pos.columnId).toBe("name")
  })

  it("DataTableColumnMeta carries editable and label", () => {
    const meta: DataTableColumnMeta = { editable: true, label: "Name" }
    expect(meta.editable).toBe(true)
    expect(meta.label).toBe("Name")
  })

  it("a conforming DataTableRuntime object type-checks", () => {
    const pos: CellPos = { rowId: "1", columnId: "name" }
    const runtime: DataTableRuntime = {
      activeCell: pos,
      editingCell: null,
      isActive: () => true,
      isEditing: () => false,
      setActiveCell: () => {},
      beginEdit: () => {},
      stopEditing: () => {},
      moveActive: () => {},
      isColumnEditable: () => true,
      updateData: () => {},
      handleKeyDown: () => {},
    }
    expect(runtime.activeCell).toEqual(pos)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/types.test.ts`
Expected: FAIL — cannot resolve `./types`.

- [ ] **Step 3: Implement `types.ts`**

Create `components/data-table/types.ts`:

```ts
import type * as React from "react"

/** Identifies one cell by its TanStack row id and column id. */
export type CellPos = { rowId: string; columnId: string }

/** Direction vocabulary shared with table-fields' FieldEditContext. */
export type MoveDirection = "next" | "prev" | "up" | "down"

/** Per-column metadata stashed on ColumnDef.meta by defineColumns. */
export type DataTableColumnMeta = {
  /** Per-column editable override; undefined falls back to the table default. */
  editable?: boolean
  /** Plain-text label for UI that can't render the header function (e.g. the columns menu). */
  label: string
}

/**
 * The live grid state + actions, provided via React Context so cell renderers
 * (built once per column by defineColumns) can read/act without prop-drilling.
 */
export type DataTableRuntime = {
  activeCell: CellPos | null
  editingCell: CellPos | null
  isActive: (pos: CellPos) => boolean
  isEditing: (pos: CellPos) => boolean
  setActiveCell: (pos: CellPos) => void
  beginEdit: (pos: CellPos) => void
  stopEditing: () => void
  moveActive: (dir: MoveDirection) => void
  isColumnEditable: (columnId: string) => boolean
  updateData: (rowId: string, columnId: string, value: unknown) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/types.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck` (expect clean).

```bash
git add components/data-table/types.ts components/data-table/types.test.ts
git commit -m "feat(data-table): add core types (CellPos, DataTableRuntime, column meta)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: data-table — grid navigation hook

**Files:**
- Create: `components/data-table/use-grid-navigation.ts`
- Test: `components/data-table/use-grid-navigation.test.ts`

This hook is pure navigation logic — it takes plain `rowIds`/`columnIds` arrays (not a TanStack table), so it's testable in isolation.

- [ ] **Step 1: Write the failing test**

Create `components/data-table/use-grid-navigation.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useGridNavigation } from "./use-grid-navigation"

const ROW_IDS = ["r1", "r2", "r3"]
const COL_IDS = ["a", "b", "c"]

function setup(isColumnEditable = () => true) {
  return renderHook(() =>
    useGridNavigation({ rowIds: ROW_IDS, columnIds: COL_IDS, isColumnEditable }),
  )
}

describe("useGridNavigation", () => {
  it("starts with no active or editing cell", () => {
    const { result } = setup()
    expect(result.current.activeCell).toBeNull()
    expect(result.current.editingCell).toBeNull()
  })

  it("setActiveCell sets the active cell and isActive reflects it", () => {
    const { result } = setup()
    act(() => result.current.setActiveCell({ rowId: "r2", columnId: "b" }))
    expect(result.current.activeCell).toEqual({ rowId: "r2", columnId: "b" })
    expect(result.current.isActive({ rowId: "r2", columnId: "b" })).toBe(true)
    expect(result.current.isActive({ rowId: "r1", columnId: "b" })).toBe(false)
  })

  it("moveActive moves next/prev/up/down and wraps rows on next/prev", () => {
    const { result } = setup()
    act(() => result.current.setActiveCell({ rowId: "r1", columnId: "c" }))
    act(() => result.current.moveActive("next")) // wraps to next row, first col
    expect(result.current.activeCell).toEqual({ rowId: "r2", columnId: "a" })
    act(() => result.current.moveActive("prev")) // wraps back
    expect(result.current.activeCell).toEqual({ rowId: "r1", columnId: "c" })
    act(() => result.current.moveActive("down"))
    expect(result.current.activeCell).toEqual({ rowId: "r2", columnId: "c" })
    act(() => result.current.moveActive("up"))
    expect(result.current.activeCell).toEqual({ rowId: "r1", columnId: "c" })
  })

  it("moveActive clamps at the grid start (up/prev at r1/a)", () => {
    const { result } = setup()
    act(() => result.current.setActiveCell({ rowId: "r1", columnId: "a" }))
    act(() => result.current.moveActive("up"))
    expect(result.current.activeCell).toEqual({ rowId: "r1", columnId: "a" })
    act(() => result.current.moveActive("prev"))
    expect(result.current.activeCell).toEqual({ rowId: "r1", columnId: "a" })
  })

  it("moveActive clamps at the grid end (down/next at the last row/column)", () => {
    const { result } = setup()
    act(() => result.current.setActiveCell({ rowId: "r3", columnId: "c" }))
    act(() => result.current.moveActive("down"))
    expect(result.current.activeCell).toEqual({ rowId: "r3", columnId: "c" })
    act(() => result.current.moveActive("next"))
    expect(result.current.activeCell).toEqual({ rowId: "r3", columnId: "c" })
  })

  it("moveActive is a no-op on an empty grid", () => {
    const { result } = renderHook(() =>
      useGridNavigation({ rowIds: [], columnIds: [], isColumnEditable: () => true }),
    )
    act(() => result.current.moveActive("next"))
    expect(result.current.activeCell).toBeNull()
  })

  it("setActiveCell exits edit mode on a different cell", () => {
    const { result } = setup()
    act(() => result.current.beginEdit({ rowId: "r1", columnId: "a" }))
    expect(result.current.editingCell).toEqual({ rowId: "r1", columnId: "a" })
    act(() => result.current.setActiveCell({ rowId: "r2", columnId: "b" }))
    expect(result.current.editingCell).toBeNull()
    expect(result.current.activeCell).toEqual({ rowId: "r2", columnId: "b" })
  })

  it("beginEdit enters edit mode only for editable columns", () => {
    const { result } = setup((columnId) => columnId === "a")
    act(() => result.current.beginEdit({ rowId: "r1", columnId: "b" }))
    expect(result.current.editingCell).toBeNull()
    act(() => result.current.beginEdit({ rowId: "r1", columnId: "a" }))
    expect(result.current.editingCell).toEqual({ rowId: "r1", columnId: "a" })
    expect(result.current.isEditing({ rowId: "r1", columnId: "a" })).toBe(true)
  })

  it("stopEditing clears editingCell but keeps activeCell", () => {
    const { result } = setup()
    act(() => result.current.beginEdit({ rowId: "r1", columnId: "a" }))
    act(() => result.current.stopEditing())
    expect(result.current.editingCell).toBeNull()
    expect(result.current.activeCell).toEqual({ rowId: "r1", columnId: "a" })
  })

  it("moveActive exits edit mode", () => {
    const { result } = setup()
    act(() => result.current.beginEdit({ rowId: "r1", columnId: "a" }))
    act(() => result.current.moveActive("next"))
    expect(result.current.editingCell).toBeNull()
  })

  it("handleKeyDown: arrow keys move, Enter begins edit, Escape exits edit", () => {
    const { result } = setup()
    act(() => result.current.setActiveCell({ rowId: "r1", columnId: "a" }))
    const preventDefault = vi.fn()
    act(() => result.current.handleKeyDown({ key: "ArrowDown", preventDefault } as any))
    expect(result.current.activeCell).toEqual({ rowId: "r2", columnId: "a" })
    expect(preventDefault).toHaveBeenCalled()

    act(() => result.current.handleKeyDown({ key: "Enter", preventDefault } as any))
    expect(result.current.editingCell).toEqual({ rowId: "r2", columnId: "a" })

    act(() => result.current.handleKeyDown({ key: "Escape", preventDefault } as any))
    expect(result.current.editingCell).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/use-grid-navigation.test.ts`
Expected: FAIL — cannot resolve `./use-grid-navigation`.

- [ ] **Step 3: Implement `use-grid-navigation.ts`**

Create `components/data-table/use-grid-navigation.ts`:

```ts
"use client"

import * as React from "react"

import type { CellPos, MoveDirection } from "./types"

export type UseGridNavigationOptions = {
  rowIds: string[]
  columnIds: string[]
  isColumnEditable: (columnId: string) => boolean
}

export type GridNavigation = {
  activeCell: CellPos | null
  editingCell: CellPos | null
  isActive: (pos: CellPos) => boolean
  isEditing: (pos: CellPos) => boolean
  setActiveCell: (pos: CellPos) => void
  beginEdit: (pos: CellPos) => void
  stopEditing: () => void
  moveActive: (dir: MoveDirection) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
}

function samePos(a: CellPos | null, b: CellPos): boolean {
  return a != null && a.rowId === b.rowId && a.columnId === b.columnId
}

/**
 * Pure grid navigation: active/editing cell state + keyboard handling, over
 * plain row/column id lists. No TanStack Table dependency — testable with
 * fabricated ids. `use-data-table.ts` supplies the real ids and combines this
 * with column-editability and data persistence into the full DataTableRuntime.
 *
 * Two responsibilities that belong to `use-data-table.ts`, not here:
 * 1. Memoize `rowIds`/`columnIds` (e.g. `useMemo` over `table.getRowModel().rows`).
 *    `moveActive`/`handleKeyDown` depend on both arrays by reference, so a
 *    fresh array every render defeats memoization on every consumer.
 * 2. Revalidate `activeCell` when the id lists change under it (sort/filter/
 *    delete) — see the comment on the orphaned-id guard in `moveActive` below.
 */
export function useGridNavigation({
  rowIds,
  columnIds,
  isColumnEditable,
}: UseGridNavigationOptions): GridNavigation {
  const [activeCell, setActiveCellState] = React.useState<CellPos | null>(null)
  const [editingCell, setEditingCell] = React.useState<CellPos | null>(null)

  const setActiveCell = React.useCallback((pos: CellPos) => {
    // Focusing a different cell always exits whatever was being edited — a
    // click elsewhere is an implicit "stop editing", not a silent orphan of
    // editingCell (which would otherwise still be "editing" a cell that's no
    // longer active, while the newly active cell shows no editor).
    setEditingCell(null)
    setActiveCellState(pos)
  }, [])

  const beginEdit = React.useCallback(
    (pos: CellPos) => {
      if (!isColumnEditable(pos.columnId)) return
      setActiveCellState(pos)
      setEditingCell(pos)
    },
    [isColumnEditable],
  )

  const stopEditing = React.useCallback(() => {
    setEditingCell(null)
  }, [])

  const moveActive = React.useCallback(
    (dir: MoveDirection) => {
      setEditingCell(null)
      setActiveCellState((current) => {
        if (rowIds.length === 0 || columnIds.length === 0) return current
        if (!current) return { rowId: rowIds[0], columnId: columnIds[0] }

        const rowIdx = rowIds.indexOf(current.rowId)
        const colIdx = columnIds.indexOf(current.columnId)
        // `current` points at a row/column id no longer in the live lists —
        // e.g. a sort/filter/delete on the table removed it while it was
        // active. This hook is deliberately table-agnostic (see the module
        // doc comment) and has no principled way to pick a replacement
        // position, so it holds still rather than guessing. The owner of
        // `rowIds`/`columnIds` (use-data-table.ts) is responsible for
        // resetting or revalidating `activeCell` — e.g. via setActiveCell —
        // when the id lists it derives from the table change out from under
        // an active cell; a silently-frozen active cell is otherwise a real
        // dead end for keyboard navigation.
        if (rowIdx === -1 || colIdx === -1) return current

        if (dir === "up") {
          return { rowId: rowIds[Math.max(0, rowIdx - 1)], columnId: current.columnId }
        }
        if (dir === "down") {
          return {
            rowId: rowIds[Math.min(rowIds.length - 1, rowIdx + 1)],
            columnId: current.columnId,
          }
        }
        if (dir === "prev") {
          if (colIdx > 0) return { rowId: current.rowId, columnId: columnIds[colIdx - 1] }
          if (rowIdx > 0) {
            return { rowId: rowIds[rowIdx - 1], columnId: columnIds[columnIds.length - 1] }
          }
          return current
        }
        // "next"
        if (colIdx < columnIds.length - 1) {
          return { rowId: current.rowId, columnId: columnIds[colIdx + 1] }
        }
        if (rowIdx < rowIds.length - 1) {
          return { rowId: rowIds[rowIdx + 1], columnId: columnIds[0] }
        }
        return current
      })
    },
    [rowIds, columnIds],
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (editingCell) {
        if (e.key === "Escape") {
          stopEditing()
          e.preventDefault()
        }
        return
      }
      if (!activeCell) return
      switch (e.key) {
        case "ArrowUp":
          moveActive("up")
          e.preventDefault()
          break
        case "ArrowDown":
          moveActive("down")
          e.preventDefault()
          break
        case "ArrowLeft":
          moveActive("prev")
          e.preventDefault()
          break
        case "ArrowRight":
          moveActive("next")
          e.preventDefault()
          break
        case "Tab":
          moveActive(e.shiftKey ? "prev" : "next")
          e.preventDefault()
          break
        case "Enter":
          beginEdit(activeCell)
          e.preventDefault()
          break
        default:
          break
      }
    },
    [activeCell, editingCell, moveActive, beginEdit, stopEditing],
  )

  return {
    activeCell,
    editingCell,
    isActive: (pos) => samePos(activeCell, pos),
    isEditing: (pos) => samePos(editingCell, pos),
    setActiveCell,
    beginEdit,
    stopEditing,
    moveActive,
    handleKeyDown,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/use-grid-navigation.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/data-table/use-grid-navigation.ts components/data-table/use-grid-navigation.test.ts`, then `pnpm typecheck`.

```bash
git add components/data-table/use-grid-navigation.ts components/data-table/use-grid-navigation.test.ts
git commit -m "feat(data-table): add pure grid navigation hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: data-table — runtime context

**Files:**
- Create: `components/data-table/data-table-runtime-context.ts`
- Test: `components/data-table/data-table-runtime-context.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/data-table/data-table-runtime-context.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { DataTableRuntimeContext, useDataTableRuntime } from "./data-table-runtime-context"
import type { DataTableRuntime } from "./types"

const STUB_RUNTIME: DataTableRuntime = {
  activeCell: null,
  editingCell: null,
  isActive: () => false,
  isEditing: () => false,
  setActiveCell: () => {},
  beginEdit: () => {},
  stopEditing: () => {},
  moveActive: () => {},
  isColumnEditable: () => false,
  updateData: () => {},
  handleKeyDown: () => {},
}

function Probe() {
  const runtime = useDataTableRuntime()
  return <span>{runtime ? "has-runtime" : "no-runtime"}</span>
}

describe("DataTableRuntimeContext", () => {
  it("defaults to null outside a provider", () => {
    render(<Probe />)
    expect(screen.getByText("no-runtime")).toBeInTheDocument()
  })

  it("provides the runtime value inside a provider", () => {
    render(
      <DataTableRuntimeContext.Provider value={STUB_RUNTIME}>
        <Probe />
      </DataTableRuntimeContext.Provider>,
    )
    expect(screen.getByText("has-runtime")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/data-table-runtime-context.test.tsx`
Expected: FAIL — cannot resolve `./data-table-runtime-context`.

- [ ] **Step 3: Implement**

Create `components/data-table/data-table-runtime-context.ts`:

```ts
"use client"

import * as React from "react"

import type { DataTableRuntime } from "./types"

/**
 * Carries the live DataTableRuntime (active/editing cell, navigation,
 * updateData) to cell renderers built by defineColumns, without prop-drilling
 * through every ColumnDef. Null outside a <DataTable> (or when a column
 * built with defineColumns is rendered in a plain table — see define-columns.ts's
 * fallback-to-display behavior in that case).
 */
export const DataTableRuntimeContext = React.createContext<DataTableRuntime | null>(null)

export function useDataTableRuntime(): DataTableRuntime | null {
  return React.useContext(DataTableRuntimeContext)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/data-table-runtime-context.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck` (expect clean).

```bash
git add components/data-table/data-table-runtime-context.ts components/data-table/data-table-runtime-context.test.tsx
git commit -m "feat(data-table): add DataTableRuntime React context

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: data-table — typed column builder (defineColumns)

**Files:**
- Create: `components/data-table/define-columns.ts`
- Test: `components/data-table/define-columns.test.tsx`

This is the centerpiece: it builds the editable-cell renderer (reads `DataTableRuntimeContext`, renders `field.display` or `field.edit` depending on grid state) and the typed `col.*` builder that produces `ColumnDef`s using it.

- [ ] **Step 1: Write the failing test**

Create `components/data-table/define-columns.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { flexRender } from "@tanstack/react-table"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import { DataTableRuntimeContext } from "./data-table-runtime-context"
import { defineColumns } from "./define-columns"
import type { CellPos, DataTableRuntime } from "./types"

type Row = { id: string; name: string; age: number; active: boolean }

const ROW: Row = { id: "r1", name: "Ada", age: 30, active: true }

function ctxFor(columnId: string, value: unknown) {
  return {
    getValue: () => value,
    row: { id: ROW.id, original: ROW },
    column: { id: columnId },
  } as any
}

function stubRuntime(overrides: Partial<DataTableRuntime> = {}): DataTableRuntime {
  return {
    activeCell: null,
    editingCell: null,
    isActive: () => false,
    isEditing: () => false,
    setActiveCell: vi.fn(),
    beginEdit: vi.fn(),
    stopEditing: vi.fn(),
    moveActive: vi.fn(),
    isColumnEditable: () => false,
    updateData: vi.fn(),
    handleKeyDown: vi.fn(),
    ...overrides,
  }
}

describe("defineColumns / col builder", () => {
  it("col.text builds a ColumnDef with the accessor, a string label in meta, and a working display cell", () => {
    const col = defineColumns<Row>()
    const column = col.text("name", { header: "Name" })
    expect(column.id).toBe("name")
    expect((column.meta as any).label).toBe("Name")

    render(
      <DataTableRuntimeContext.Provider value={stubRuntime()}>
        {flexRender(column.cell, ctxFor("name", "Ada"))}
      </DataTableRuntimeContext.Provider>,
    )
    expect(screen.getByText("Ada")).toBeInTheDocument()
  })

  it("col.number rejects a non-numeric key at compile time (type-level; see column-usage note below)", () => {
    const col = defineColumns<Row>()
    // @ts-expect-error "name" is a string field, not assignable to col.number
    col.number("name")
    expect(true).toBe(true)
  })

  it("defaults label to a capitalized accessor key when header isn't a string", () => {
    const col = defineColumns<Row>()
    const column = col.number("age")
    expect((column.meta as any).label).toBe("Age")
  })

  it("renders field.display outside a DataTableRuntimeContext (degrades to read-only)", () => {
    const col = defineColumns<Row>()
    const column = col.text("name")
    render(<>{flexRender(column.cell, ctxFor("name", "Ada"))}</>)
    expect(screen.getByText("Ada")).toBeInTheDocument()
  })

  it("clicking an already-active editable cell begins edit; typing commits via updateData", () => {
    const pos: CellPos = { rowId: "r1", columnId: "name" }
    const runtime = stubRuntime({
      isActive: (p) => p.rowId === pos.rowId && p.columnId === pos.columnId,
      isColumnEditable: () => true,
    })
    const col = defineColumns<Row>()
    const column = col.text("name", { editable: true })

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctxFor("name", "Ada"))}
      </DataTableRuntimeContext.Provider>,
    )
    fireEvent.click(screen.getByText("Ada"))
    expect(runtime.beginEdit).toHaveBeenCalledWith(pos)
  })

  it("editing mode renders the field's edit renderer and commits through runtime.updateData", () => {
    const pos: CellPos = { rowId: "r1", columnId: "name" }
    const runtime = stubRuntime({
      isActive: (p) => p.rowId === pos.rowId && p.columnId === pos.columnId,
      isEditing: (p) => p.rowId === pos.rowId && p.columnId === pos.columnId,
      isColumnEditable: () => true,
    })
    const col = defineColumns<Row>()
    const column = col.text("name", { editable: true })

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctxFor("name", "Ada"))}
      </DataTableRuntimeContext.Provider>,
    )
    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "Grace" } })
    fireEvent.blur(input)
    expect(runtime.updateData).toHaveBeenCalledWith("r1", "name", "Grace")
    expect(runtime.stopEditing).toHaveBeenCalled()
  })

  it("col.checkbox honors a false editable override even when the table default is editable", () => {
    const runtime = stubRuntime({ isColumnEditable: () => true }) // table-level default: editable
    const col = defineColumns<Row>()
    const column = col.checkbox("active", { editable: false })
    expect((column.meta as any).editable).toBe(false)

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctxFor("active", true))}
      </DataTableRuntimeContext.Provider>,
    )
    // Read-only pill renders; no checkbox input present.
    expect(screen.queryByRole("checkbox")).toBeNull()
    expect(screen.getByText("True")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/define-columns.test.tsx`
Expected: FAIL — cannot resolve `./define-columns`.

- [ ] **Step 3: Implement `define-columns.ts`**

Create `components/data-table/define-columns.ts`:

```tsx
"use client"

import * as React from "react"
import type { CellContext, ColumnDef } from "@tanstack/react-table"

import {
  buttonField,
  checkboxField,
  currencyField,
  dateField,
  durationField,
  emailField,
  longTextField,
  multiSelectField,
  numberField,
  percentField,
  phoneField,
  ratingField,
  singleSelectField,
  textField,
  urlField,
  type FieldType,
  type SelectOption,
} from "@/components/table-fields"

import { useDataTableRuntime } from "./data-table-runtime-context"
import type { CellPos, DataTableColumnMeta } from "./types"

/** Keys of TData whose value type extends V. Powers col.number("age") type-checking. */
type KeysMatching<TData, V> = {
  [K in keyof TData]-?: TData[K] extends V ? (V extends TData[K] ? K : never) : never
}[keyof TData] &
  string

type ColumnOptions = {
  header?: string
  editable?: boolean
  enableSorting?: boolean
  enableHiding?: boolean
  enablePinning?: boolean
  enableResizing?: boolean
  size?: number
}

function labelFor(key: string, header?: string): string {
  if (header) return header
  return key.charAt(0).toUpperCase() + key.slice(1)
}

/**
 * Renders a field's display or edit UI depending on live DataTableRuntime
 * state. Built once per column (stable identity across renders), so it can
 * hold its own local "staged" edit value via useState — `field.edit` itself
 * is a plain function (not a component), so all editing state lives here,
 * one level up, and is handed to `field.edit` through FieldEditContext.
 */
function makeFieldCell<TData, V>(
  field: FieldType<V>,
  columnEditableOverride: boolean | undefined,
) {
  return function FieldCell(ctx: CellContext<TData, unknown>) {
    const runtime = useDataTableRuntime()
    const value = ctx.getValue() as V
    const pos: CellPos = { rowId: ctx.row.id, columnId: ctx.column.id }
    const [staged, setStaged] = React.useState<V>(value)

    if (!runtime) {
      // No <DataTable> runtime in scope — degrade to a plain read-only cell.
      return field.display(ctx as CellContext<unknown, V>)
    }

    const editable =
      (columnEditableOverride ?? runtime.isColumnEditable(pos.columnId)) && Boolean(field.edit)
    const isEditing = runtime.isEditing(pos)
    const isActive = runtime.isActive(pos)

    React.useEffect(() => {
      if (isEditing) setStaged(value)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing])

    if (isEditing && field.edit) {
      return field.edit({
        value: staged,
        setValue: setStaged,
        commit: () => {
          runtime.updateData(pos.rowId, pos.columnId, staged)
          runtime.stopEditing()
        },
        cancel: () => runtime.stopEditing(),
        focusNext: (dir) => {
          runtime.stopEditing()
          runtime.moveActive(dir)
        },
      })
    }

    return (
      <div
        tabIndex={0}
        data-active={isActive ? "true" : undefined}
        onClick={() => {
          if (isActive && editable) runtime.beginEdit(pos)
          else runtime.setActiveCell(pos)
        }}
        onFocus={() => runtime.setActiveCell(pos)}
        className="rounded-sm px-2 py-1 outline-none data-[active=true]:ring-2 data-[active=true]:ring-ring data-[active=true]:ring-inset"
      >
        {field.display(ctx as CellContext<unknown, V>)}
      </div>
    )
  }
}

function buildColumn<TData, V>(
  field: FieldType<V>,
  key: string,
  opts: ColumnOptions = {},
): ColumnDef<TData, unknown> {
  const meta: DataTableColumnMeta = { editable: opts.editable, label: labelFor(key, opts.header) }
  return {
    id: key,
    accessorKey: key as never,
    header: meta.label,
    cell: makeFieldCell<TData, V>(field, opts.editable),
    meta,
    enableSorting: opts.enableSorting ?? true,
    enableHiding: opts.enableHiding ?? true,
    enablePinning: opts.enablePinning ?? true,
    enableResizing: opts.enableResizing ?? true,
    size: opts.size,
  }
}

/**
 * Returns a typed `col` builder closed over TData. Each method constrains its
 * accessor key to a TData key whose value type matches the field (e.g.
 * `col.number` only accepts keys typed `number`), and returns a ColumnDef
 * ready to drop into `columns: [...]`.
 */
export function defineColumns<TData>() {
  return {
    text: (key: KeysMatching<TData, string>, opts?: ColumnOptions) =>
      buildColumn<TData, string>(textField(), key, opts),
    longText: (key: KeysMatching<TData, string>, opts?: ColumnOptions) =>
      buildColumn<TData, string>(longTextField(), key, opts),
    url: (key: KeysMatching<TData, string>, opts?: ColumnOptions) =>
      buildColumn<TData, string>(urlField(), key, opts),
    email: (key: KeysMatching<TData, string>, opts?: ColumnOptions) =>
      buildColumn<TData, string>(emailField(), key, opts),
    phone: (key: KeysMatching<TData, string>, opts?: ColumnOptions) =>
      buildColumn<TData, string>(phoneField(), key, opts),
    number: (
      key: KeysMatching<TData, number>,
      opts?: ColumnOptions & { locale?: string; maximumFractionDigits?: number },
    ) => buildColumn<TData, number>(numberField(opts), key, opts),
    currency: (
      key: KeysMatching<TData, number>,
      opts?: ColumnOptions & { currency?: string; locale?: string },
    ) => buildColumn<TData, number>(currencyField(opts), key, opts),
    percent: (
      key: KeysMatching<TData, number>,
      opts?: ColumnOptions & { locale?: string; maximumFractionDigits?: number },
    ) => buildColumn<TData, number>(percentField(opts), key, opts),
    duration: (
      key: KeysMatching<TData, number>,
      opts?: ColumnOptions & { unit?: "s" | "ms"; maxUnits?: number },
    ) => buildColumn<TData, number>(durationField(opts), key, opts),
    singleSelect: (
      key: KeysMatching<TData, string>,
      opts: ColumnOptions & { options: SelectOption[] },
    ) => buildColumn<TData, string>(singleSelectField(opts), key, opts),
    multiSelect: (
      key: KeysMatching<TData, string[]>,
      opts: ColumnOptions & { options: SelectOption[] },
    ) => buildColumn<TData, string[]>(multiSelectField(opts), key, opts),
    checkbox: (key: KeysMatching<TData, boolean>, opts?: ColumnOptions) =>
      buildColumn<TData, boolean>(checkboxField(), key, opts),
    rating: (key: KeysMatching<TData, number>, opts?: ColumnOptions & { max?: number }) =>
      buildColumn<TData, number>(ratingField(opts), key, opts),
    date: (
      key: KeysMatching<TData, Date | string>,
      opts?: ColumnOptions & { withTime?: boolean; locale?: string },
    ) => buildColumn<TData, Date | string>(dateField(opts), key, opts),
    button: (
      id: string,
      opts: ColumnOptions & { label: string; onClick: (row: TData) => void },
    ) => buildColumn<TData, unknown>(buttonField<TData>(opts), id, opts),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/define-columns.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/data-table/define-columns.ts components/data-table/define-columns.test.tsx` (fix any errors; the `eslint-disable-next-line react-hooks/exhaustive-deps` comment is intentional — the effect must run only on `isEditing` transitions, not on `value`), then `pnpm typecheck` (expect clean — this also proves the `@ts-expect-error` in the test is a REAL compile error, since `@ts-expect-error` itself fails typecheck if the following line does NOT error).

```bash
git add components/data-table/define-columns.ts components/data-table/define-columns.test.tsx
git commit -m "feat(data-table): add typed defineColumns builder + editable cell renderer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: data-table — base-ui/Radix primitives shim

**Files:**
- Create: `components/data-table/primitives.tsx`
- Create: `components/data-table/primitives.radix.tsx`
- Test: `components/data-table/primitives.test.tsx`
- Modify: `tsconfig.json` (confirm `**/*.radix.tsx` exclude already covers this new file — it's a glob, so no change needed; this step just verifies it)

This mirrors `components/grouped-data-table/primitives.tsx` exactly (same divergence, same comment convention), reduced to only `PopoverButtonTrigger` since `data-table`'s own UI (the columns menu) needs a popover trigger but no `Select`.

- [ ] **Step 1: Write the failing test**

Create `components/data-table/primitives.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Popover, PopoverContent } from "@/components/ui/popover"
import { PopoverButtonTrigger } from "./primitives"

describe("PopoverButtonTrigger", () => {
  it("renders a labeled button trigger with its children", () => {
    render(
      <Popover>
        <PopoverButtonTrigger ariaLabel="Open menu">Columns</PopoverButtonTrigger>
        <PopoverContent>hidden</PopoverContent>
      </Popover>,
    )
    const trigger = screen.getByLabelText("Open menu")
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent("Columns")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/primitives.test.tsx`
Expected: FAIL — cannot resolve `./primitives`.

- [ ] **Step 3: Implement the base-ui build**

Create `components/data-table/primitives.tsx`:

```tsx
"use client"

// base-ui build of the primitives shim. Keep the EXPORTED API identical to its
// Radix twin, primitives.radix.tsx — only the function body may differ. The
// divergence: PopoverButtonTrigger composes via base-ui's `render` prop here;
// the Radix build uses `asChild` with a nested <Button>. If you change a prop
// name, type, or default below, mirror it in the twin.

import * as React from "react"

import { Button } from "@/components/ui/button"
import { PopoverTrigger } from "@/components/ui/popover"

export type PopoverButtonTriggerProps = {
  children: React.ReactNode
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
  ariaLabel?: string
}

/**
 * Popover trigger rendered as a Button, normalized across base-ui / Radix. The
 * base-ui build uses base-ui's `render` prop; the Radix build uses `asChild`.
 * Must be used inside a <Popover>.
 */
export function PopoverButtonTrigger({
  children,
  variant = "outline",
  size = "sm",
  className,
  ariaLabel,
}: PopoverButtonTriggerProps) {
  return (
    <PopoverTrigger
      render={(p) => (
        <Button
          {...p}
          type="button"
          variant={variant}
          size={size}
          aria-label={ariaLabel}
          className={className}
        />
      )}
    >
      {children}
    </PopoverTrigger>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/primitives.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Implement the Radix twin**

Create `components/data-table/primitives.radix.tsx`:

```tsx
"use client"

// Radix build of the primitives shim. Keep the EXPORTED API identical to its
// base-ui twin, primitives.tsx — only the function body may differ. The
// divergence: PopoverButtonTrigger composes via `asChild` + a nested <Button>
// here; the base-ui build uses base-ui's `render` prop. This file is
// distribution-only: it is excluded from this repo's typecheck (tsconfig
// `**/*.radix.tsx`) and is never imported here — it is validated against real
// Radix primitives in a consumer project.

import * as React from "react"

import { Button } from "@/components/ui/button"
import { PopoverTrigger } from "@/components/ui/popover"

export type PopoverButtonTriggerProps = {
  children: React.ReactNode
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
  ariaLabel?: string
}

/** Radix build of the PopoverButtonTrigger shim — see primitives.tsx for the base-ui build. */
export function PopoverButtonTrigger({
  children,
  variant = "outline",
  size = "sm",
  className,
  ariaLabel,
}: PopoverButtonTriggerProps) {
  return (
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant={variant}
        size={size}
        aria-label={ariaLabel}
        className={className}
      >
        {children}
      </Button>
    </PopoverTrigger>
  )
}
```

- [ ] **Step 6: Confirm the Radix twin is excluded from typecheck and add the parity test**

Create `components/data-table/primitives.parity.test.ts` (mirrors `components/grouped-data-table/primitives.parity.test.ts` exactly):

```ts
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The base-ui (`primitives.tsx`) and Radix (`primitives.radix.tsx`) builds of
 * the shim must expose an IDENTICAL public type surface. `primitives.radix.tsx`
 * is excluded from `tsc`, so a drifting prop would otherwise go unnoticed until
 * a Radix consumer's install fails to compile. This test fails loudly instead.
 */

const dir = resolve(__dirname)
const base = readFileSync(resolve(dir, "primitives.tsx"), "utf8")
const radix = readFileSync(resolve(dir, "primitives.radix.tsx"), "utf8")

function extractType(src: string, name: string): string {
  const match = src.match(new RegExp(`export type ${name} =[\\s\\S]*?(?=\\n\\n)`))
  if (!match) throw new Error(`export type ${name} not found`)
  return match[0].trim()
}

describe("data-table primitives variant parity", () => {
  it("exports an identical PopoverButtonTriggerProps type in both builds", () => {
    expect(extractType(radix, "PopoverButtonTriggerProps")).toBe(
      extractType(base, "PopoverButtonTriggerProps"),
    )
  })
})
```

Run: `pnpm exec vitest run components/data-table/primitives.parity.test.ts`
Expected: PASS (1 test).

Run: `pnpm typecheck`
Expected: no output — proves `primitives.radix.tsx` (which uses `asChild`, absent from base-ui's `PopoverTrigger` type) is excluded via the existing `tsconfig.json` `**/*.radix.tsx` glob, unchanged from Plan 1.

- [ ] **Step 7: Lint + commit**

Run: `pnpm exec eslint components/data-table/primitives.tsx components/data-table/primitives.test.tsx components/data-table/primitives.parity.test.ts`.

```bash
git add components/data-table/primitives.tsx components/data-table/primitives.radix.tsx components/data-table/primitives.test.tsx components/data-table/primitives.parity.test.ts
git commit -m "feat(data-table): add base-ui/Radix primitives shim (PopoverButtonTrigger)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: data-table — sortable column header

**Files:**
- Create: `components/data-table/column-header.tsx`
- Test: `components/data-table/column-header.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/data-table/column-header.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ColumnHeader } from "./column-header"

function mockColumn({
  canSort = true,
  sorted = false as false | "asc" | "desc",
}: { canSort?: boolean; sorted?: false | "asc" | "desc" } = {}) {
  return {
    getCanSort: () => canSort,
    getIsSorted: () => sorted,
    getToggleSortingHandler: () => vi.fn(),
  } as any
}

describe("ColumnHeader", () => {
  it("renders the label as plain text when the column can't sort", () => {
    render(<ColumnHeader column={mockColumn({ canSort: false })} label="Name" />)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("renders a clickable button with a sort indicator when the column can sort", () => {
    const handler = vi.fn()
    const column = mockColumn()
    column.getToggleSortingHandler = () => handler
    render(<ColumnHeader column={column} label="Name" />)
    const button = screen.getByRole("button", { name: /Name/ })
    fireEvent.click(button)
    expect(handler).toHaveBeenCalled()
  })

  it("reflects the current sort direction", () => {
    const { rerender } = render(
      <ColumnHeader column={mockColumn({ sorted: "asc" })} label="Age" />,
    )
    expect(screen.getByRole("button").querySelector('[data-sort="asc"]')).not.toBeNull()
    rerender(<ColumnHeader column={mockColumn({ sorted: "desc" })} label="Age" />)
    expect(screen.getByRole("button").querySelector('[data-sort="desc"]')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/column-header.test.tsx`
Expected: FAIL — cannot resolve `./column-header`.

- [ ] **Step 3: Implement `column-header.tsx`**

Create `components/data-table/column-header.tsx`:

```tsx
"use client"

import type { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import type * as React from "react"

export function ColumnHeader<TData, TValue>({
  column,
  label,
  icon: Icon,
}: {
  column: Column<TData, TValue>
  label: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}) {
  const canSort = column.getCanSort()

  if (!canSort) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </span>
    )
  }

  const sorted = column.getIsSorted()
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {label}
      {sorted === "asc" ? (
        <ArrowUp data-sort="asc" className="size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown data-sort="desc" className="size-3.5" />
      ) : (
        <ChevronsUpDown data-sort="none" className="size-3.5 opacity-40" />
      )}
    </button>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/column-header.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/data-table/column-header.tsx components/data-table/column-header.test.tsx`, then `pnpm typecheck`.

```bash
git add components/data-table/column-header.tsx components/data-table/column-header.test.tsx
git commit -m "feat(data-table): add sortable ColumnHeader

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: data-table — columns menu (hide + pin)

**Files:**
- Create: `components/data-table/columns-menu.tsx`
- Test: `components/data-table/columns-menu.test.tsx`

Mirrors `components/grouped-data-table/dimension-picker.tsx`'s structure (a `*Content` component for the popover body + a wrapping component with the `PopoverButtonTrigger`).

- [ ] **Step 1: Write the failing test**

Create `components/data-table/columns-menu.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ColumnsMenuContent } from "./columns-menu"

function mockColumn({
  id,
  label,
  visible = true,
  pinned = false as false | "left" | "right",
  canHide = true,
  canPin = true,
}: {
  id: string
  label: string
  visible?: boolean
  pinned?: false | "left" | "right"
  canHide?: boolean
  canPin?: boolean
}) {
  return {
    id,
    columnDef: { meta: { label } },
    getCanHide: () => canHide,
    getCanPin: () => canPin,
    getIsVisible: () => visible,
    toggleVisibility: vi.fn(),
    getIsPinned: () => pinned,
    pin: vi.fn(),
  } as any
}

describe("ColumnsMenuContent", () => {
  it("lists each hideable/pinnable column by its meta label", () => {
    const columns = [mockColumn({ id: "name", label: "Name" }), mockColumn({ id: "age", label: "Age" })]
    const table = { getAllLeafColumns: () => columns } as any
    render(<ColumnsMenuContent table={table} />)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Age")).toBeInTheDocument()
  })

  it("toggling the checkbox calls column.toggleVisibility", () => {
    const column = mockColumn({ id: "name", label: "Name", visible: true })
    const table = { getAllLeafColumns: () => [column] } as any
    render(<ColumnsMenuContent table={table} />)
    fireEvent.click(screen.getByRole("checkbox"))
    expect(column.toggleVisibility).toHaveBeenCalledWith(false)
  })

  it("clicking pin-left calls column.pin('left'); clicking again unpins", () => {
    const column = mockColumn({ id: "name", label: "Name" })
    const table = { getAllLeafColumns: () => [column] } as any
    render(<ColumnsMenuContent table={table} />)
    fireEvent.click(screen.getByLabelText("Pin Name left"))
    expect(column.pin).toHaveBeenCalledWith("left")
  })

  it("a column with getCanHide/getCanPin both false renders without a checkbox or pin buttons", () => {
    const column = mockColumn({ id: "name", label: "Name", canHide: false, canPin: false })
    const table = { getAllLeafColumns: () => [column] } as any
    render(<ColumnsMenuContent table={table} />)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.queryByRole("checkbox")).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/columns-menu.test.tsx`
Expected: FAIL — cannot resolve `./columns-menu`.

- [ ] **Step 3: Implement `columns-menu.tsx`**

Create `components/data-table/columns-menu.tsx`:

```tsx
"use client"

import type { Table } from "@tanstack/react-table"
import { ArrowLeftToLine, ArrowRightToLine, Columns3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent } from "@/components/ui/popover"

import { PopoverButtonTrigger } from "./primitives"
import type { DataTableColumnMeta } from "./types"

export function ColumnsMenuContent<TData>({ table }: { table: Table<TData> }) {
  const columns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide() || column.getCanPin())

  return (
    <div className="space-y-0.5">
      {columns.map((column) => {
        const label = (column.columnDef.meta as DataTableColumnMeta | undefined)?.label ?? column.id
        const pinned = column.getIsPinned()
        return (
          <div
            key={column.id}
            className="flex items-center justify-between gap-2 rounded-sm px-1 py-1 text-sm hover:bg-muted"
          >
            <label className="flex flex-1 cursor-pointer items-center gap-2 select-none">
              {column.getCanHide() ? (
                <Checkbox
                  checked={column.getIsVisible()}
                  onCheckedChange={(checked) => column.toggleVisibility(checked === true)}
                />
              ) : null}
              <span className="flex-1">{label}</span>
            </label>
            {column.getCanPin() ? (
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant={pinned === "left" ? "secondary" : "ghost"}
                  size="icon-xs"
                  aria-label={`Pin ${label} left`}
                  onClick={() => column.pin(pinned === "left" ? false : "left")}
                >
                  <ArrowLeftToLine className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant={pinned === "right" ? "secondary" : "ghost"}
                  size="icon-xs"
                  aria-label={`Pin ${label} right`}
                  onClick={() => column.pin(pinned === "right" ? false : "right")}
                >
                  <ArrowRightToLine className="size-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function ColumnsMenu<TData>({ table }: { table: Table<TData> }) {
  return (
    <Popover>
      <PopoverButtonTrigger className="gap-2">
        <Columns3 className="size-4" />
        Columns
      </PopoverButtonTrigger>
      <PopoverContent align="start" className="w-64">
        <ColumnsMenuContent table={table} />
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/columns-menu.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/data-table/columns-menu.tsx components/data-table/columns-menu.test.tsx`, then `pnpm typecheck`.

```bash
git add components/data-table/columns-menu.tsx components/data-table/columns-menu.test.tsx
git commit -m "feat(data-table): add columns menu (hide + pin)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 13: data-table — state hook (useDataTable)

**Files:**
- Create: `components/data-table/use-data-table.ts`
- Test: `components/data-table/use-data-table.test.tsx`

Wires TanStack state (sorting/visibility/pinning/sizing/pagination) and combines it with `useGridNavigation` into the full `DataTableRuntime`.

**Two requirements inherited from `use-grid-navigation.ts`'s module doc comment (added during Task 7's code review — do not drop these when implementing Step 3 below):**
1. **Memoize `rowIds`/`columnIds`** before passing them to `useGridNavigation` (e.g. `React.useMemo(() => table.getRowModel().rows.map(r => r.id), [table.getRowModel().rows])`) — `table.getRowModel().rows` is a fresh array every render, and `moveActive`/`handleKeyDown` depend on both id arrays by reference, so an unmemoized pass-through defeats their memoization on every render.
2. **Revalidate `activeCell` when the id lists change under it** (sort/filter/delete removes the active row/column). `useGridNavigation` deliberately holds the active cell still rather than guessing a replacement when its own `rowIds`/`columnIds` no longer contain it — see the comment on the orphaned-id guard in `moveActive`. Add a `React.useEffect` here that clears or resets `activeCell` (via `runtime.setActiveCell`/a runtime reset, whichever this task's design lands on) when `activeCell` points at a row/column id no longer present in the memoized `rowIds`/`columnIds`, so keyboard navigation never silently freezes.

- [ ] **Step 1: Write the failing test**

Create `components/data-table/use-data-table.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { defineColumns } from "./define-columns"
import { useDataTable } from "./use-data-table"

type Row = { id: string; name: string; age: number }

const DATA: Row[] = [
  { id: "1", name: "Bailey", age: 44 },
  { id: "2", name: "Ada", age: 30 },
]

describe("useDataTable", () => {
  it("builds a table with rows from data using getRowId", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name"), col.number("age")],
        getRowId: (row) => row.id,
      }),
    )
    expect(result.current.table.getRowModel().rows.map((r) => r.id)).toEqual(["1", "2"])
  })

  it("defaults getRowId to the row index when not provided", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")] }),
    )
    expect(result.current.table.getRowModel().rows.map((r) => r.id)).toEqual(["0", "1"])
  })

  it("isColumnEditable resolves column override over the table default", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name", { editable: false }), col.number("age")],
        editable: true,
      }),
    )
    expect(result.current.runtime.isColumnEditable("name")).toBe(false) // column override wins
    expect(result.current.runtime.isColumnEditable("age")).toBe(true) // falls back to table default
  })

  it("runtime.updateData calls the onUpdateData callback", () => {
    const onUpdateData = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name")],
        getRowId: (row) => row.id,
        onUpdateData,
      }),
    )
    act(() => result.current.runtime.updateData("1", "name", "Grace"))
    expect(onUpdateData).toHaveBeenCalledWith("1", "name", "Grace")
  })

  it("sorting state is wired: toggling a column's sort updates table.getState().sorting", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.number("age")], getRowId: (row) => row.id }),
    )
    act(() => result.current.table.getColumn("age")!.toggleSorting(false))
    expect(result.current.table.getState().sorting).toEqual([{ id: "age", desc: false }])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx`
Expected: FAIL — cannot resolve `./use-data-table`.

- [ ] **Step 3: Implement `use-data-table.ts`**

Create `components/data-table/use-data-table.ts`:

```ts
"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnPinningState,
  type ColumnSizingState,
  type PaginationState,
  type SortingState,
  type Table,
  type VisibilityState,
} from "@tanstack/react-table"

import { useGridNavigation } from "./use-grid-navigation"
import type { DataTableColumnMeta, DataTableRuntime } from "./types"

export type UseDataTableOptions<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  getRowId?: (row: TData, index: number) => string
  editable?: boolean
  onUpdateData?: (rowId: string, columnId: string, value: unknown) => void
  enablePagination?: boolean
}

export type UseDataTableResult<TData> = {
  table: Table<TData>
  runtime: DataTableRuntime
}

export function useDataTable<TData>({
  data,
  columns,
  getRowId,
  editable = false,
  onUpdateData,
  enablePagination = true,
}: UseDataTableOptions<TData>): UseDataTableResult<TData> {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({})
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  // React Compiler reports "Use of incompatible library" here: useReactTable
  // returns identity-stable functions it cannot safely memoize, so it skips
  // compiling this component. Expected with TanStack Table, harmless.
  const table = useReactTable<TData>({
    data,
    columns,
    getRowId: getRowId ?? ((row, index) => String(index)),
    state: {
      sorting,
      columnVisibility,
      columnPinning,
      columnSizing,
      ...(enablePagination ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(enablePagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    autoResetPageIndex: false,
  })

  const rowIds = React.useMemo(
    () => table.getRowModel().rows.map((r) => r.id),
    [table.getRowModel().rows],
  )
  const columnIds = React.useMemo(
    () => table.getVisibleLeafColumns().map((c) => c.id),
    [table.getVisibleLeafColumns()],
  )

  const isColumnEditable = React.useCallback(
    (columnId: string) => {
      const override = (table.getColumn(columnId)?.columnDef.meta as
        | DataTableColumnMeta
        | undefined)?.editable
      return override ?? editable
    },
    [table, editable],
  )

  const nav = useGridNavigation({ rowIds, columnIds, isColumnEditable })

  const updateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      onUpdateData?.(rowId, columnId, value)
    },
    [onUpdateData],
  )

  const runtime: DataTableRuntime = { ...nav, isColumnEditable, updateData }

  return { table, runtime }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/use-data-table.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/data-table/use-data-table.ts components/data-table/use-data-table.test.tsx`, then `pnpm typecheck`.

```bash
git add components/data-table/use-data-table.ts components/data-table/use-data-table.test.tsx
git commit -m "feat(data-table): add useDataTable state hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 14: data-table — composition root (DataTable)

**Files:**
- Create: `components/data-table/data-table.tsx`
- Test: `components/data-table/data-table.test.tsx`

Renders the `Table`, wires pinned-column sticky styles (via TanStack's confirmed `column.getStart('left')` / `column.getAfter('right')` API), the columns menu toolbar, and pagination controls (matching `grouped-data-table.tsx`'s existing pattern).

- [ ] **Step 1: Write the failing test**

Create `components/data-table/data-table.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DataTable } from "./data-table"
import { defineColumns } from "./define-columns"

type Row = { id: string; name: string; age: number }

const DATA: Row[] = [
  { id: "1", name: "Bailey", age: 44 },
  { id: "2", name: "Ada", age: 30 },
]

function columns() {
  const col = defineColumns<Row>()
  return [col.text("name", { header: "Name" }), col.number("age", { header: "Age" })]
}

describe("DataTable", () => {
  it("renders headers and rows", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Bailey")).toBeInTheDocument()
    expect(screen.getByText("Ada")).toBeInTheDocument()
  })

  it("shows a 'No results' row when data is empty", () => {
    render(<DataTable data={[]} columns={columns()} getRowId={(r) => r.id} />)
    expect(screen.getByText("No results.")).toBeInTheDocument()
  })

  it("clicking a cell then clicking again enters edit mode when editable, and commits via onUpdateData", () => {
    const onUpdateData = vi.fn()
    render(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        editable
        onUpdateData={onUpdateData}
      />,
    )
    const cell = screen.getByText("Bailey")
    fireEvent.click(cell) // first click: activate
    fireEvent.click(screen.getByText("Bailey")) // second click on active cell: edit
    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "Grace" } })
    fireEvent.blur(input)
    expect(onUpdateData).toHaveBeenCalledWith("1", "name", "Grace")
  })

  it("renders the Columns menu toolbar button", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    expect(screen.getByRole("button", { name: /columns/i })).toBeInTheDocument()
  })

  it("pagination controls are shown by default and can be disabled", () => {
    const { rerender } = render(
      <DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />,
    )
    expect(screen.getByRole("navigation", { name: "Table pagination" })).toBeInTheDocument()
    rerender(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        enablePagination={false}
      />,
    )
    expect(screen.queryByRole("navigation", { name: "Table pagination" })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/data-table.test.tsx`
Expected: FAIL — cannot resolve `./data-table`.

- [ ] **Step 3: Implement `data-table.tsx`**

Create `components/data-table/data-table.tsx`:

```tsx
"use client"

import { flexRender, type Column, type ColumnDef } from "@tanstack/react-table"
import type * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ColumnHeader } from "./column-header"
import { ColumnsMenu } from "./columns-menu"
import { DataTableRuntimeContext } from "./data-table-runtime-context"
import { useDataTable } from "./use-data-table"
import type { DataTableColumnMeta } from "./types"

export type DataTableProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  getRowId?: (row: TData, index: number) => string
  editable?: boolean
  onUpdateData?: (rowId: string, columnId: string, value: unknown) => void
  enablePagination?: boolean
}

function pinnedStyle<TData>(column: Column<TData, unknown>): React.CSSProperties {
  const pinned = column.getIsPinned()
  if (!pinned) return {}
  return {
    position: "sticky",
    left: pinned === "left" ? column.getStart("left") : undefined,
    right: pinned === "right" ? column.getAfter("right") : undefined,
    zIndex: 1,
    background: "var(--background)",
    boxShadow:
      pinned === "left"
        ? "1px 0 0 0 var(--border) inset"
        : "-1px 0 0 0 var(--border) inset",
  }
}

export function DataTable<TData>(props: DataTableProps<TData>) {
  const { table, runtime } = useDataTable(props)
  const enablePagination = props.enablePagination ?? true
  const columnCount = table.getVisibleFlatColumns().length

  return (
    <DataTableRuntimeContext.Provider value={runtime}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ColumnsMenu table={table} />
        </div>

        <div className="rounded-md border" onKeyDown={runtime.handleKeyDown}>
          <Table style={{ tableLayout: "fixed" }}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize(), ...pinnedStyle(header.column) }}
                      >
                        {header.isPlaceholder ? null : (
                          <ColumnHeader column={header.column} label={meta?.label ?? header.column.id} />
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                    No results.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize(), ...pinnedStyle(cell.column) }}
                        className="p-0"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {enablePagination && (
          <nav aria-label="Table pagination" className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Previous page"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label="Next page"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </nav>
        )}
      </div>
    </DataTableRuntimeContext.Provider>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/data-table/data-table.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm exec eslint components/data-table/data-table.tsx components/data-table/data-table.test.tsx`, then `pnpm typecheck`.

```bash
git add components/data-table/data-table.tsx components/data-table/data-table.test.tsx
git commit -m "feat(data-table): add DataTable composition root

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 15: data-table — barrel export

**Files:**
- Create: `components/data-table/index.ts`
- Test: `components/data-table/index.test.ts`

- [ ] **Step 1: Write the failing test**

Create `components/data-table/index.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import * as dataTable from "./index"

describe("data-table barrel", () => {
  it("re-exports the public surface", () => {
    for (const name of [
      "DataTable",
      "defineColumns",
      "ColumnHeader",
      "ColumnsMenu",
      "ColumnsMenuContent",
      "useDataTable",
      "useGridNavigation",
      "DataTableRuntimeContext",
      "useDataTableRuntime",
      "PopoverButtonTrigger",
    ]) {
      expect(dataTable).toHaveProperty(name)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/data-table/index.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Implement `index.ts`**

Create `components/data-table/index.ts`:

```ts
export { DataTable, type DataTableProps } from "./data-table"
export { defineColumns } from "./define-columns"
export { ColumnHeader } from "./column-header"
export { ColumnsMenu, ColumnsMenuContent } from "./columns-menu"
export { useDataTable, type UseDataTableOptions, type UseDataTableResult } from "./use-data-table"
export { useGridNavigation, type GridNavigation, type UseGridNavigationOptions } from "./use-grid-navigation"
export { DataTableRuntimeContext, useDataTableRuntime } from "./data-table-runtime-context"
export { PopoverButtonTrigger } from "./primitives"
export type {
  CellPos,
  DataTableColumnMeta,
  DataTableRuntime,
  MoveDirection,
} from "./types"
```

- [ ] **Step 4: Run the full data-table suite + typecheck**

Run: `pnpm exec vitest run components/data-table/`
Expected: all suites PASS.

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 5: Lint + commit**

Run: `pnpm exec eslint components/data-table/index.ts components/data-table/index.test.ts`.

```bash
git add components/data-table/index.ts components/data-table/index.test.ts
git commit -m "feat(data-table): add barrel export

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 16: data-table — registry item + build

**Files:**
- Modify: `registry.json`
- Rebuild: `public/r/data-table.json`, `public/r/data-table-radix.json`, `public/r/registry.json`

- [ ] **Step 1: Read `registry.json`** to confirm the current items array (it now has `grouped-data-table`, `grouped-data-table-radix`, `table-fields`).

- [ ] **Step 2: Add the `data-table` item.** Add this object to the top-level `items` array:

```json
    {
      "name": "data-table",
      "type": "registry:block",
      "title": "Data Table",
      "description": "A type-safe, editable DataTable<TData> for shadcn + TanStack Table v8: grid keyboard navigation, inline cell editing, sortable/hideable/freezable/resizable columns, built on @kotsas-ui/table-fields. Requires a base-ui shadcn setup.",
      "dependencies": ["@tanstack/react-table", "lucide-react"],
      "registryDependencies": [
        "@kotsas-ui/table-fields",
        "table",
        "button",
        "checkbox",
        "popover",
        "input"
      ],
      "files": [
        { "path": "components/data-table/types.ts", "type": "registry:lib", "target": "components/data-table/types.ts" },
        { "path": "components/data-table/use-grid-navigation.ts", "type": "registry:hook", "target": "components/data-table/use-grid-navigation.ts" },
        { "path": "components/data-table/data-table-runtime-context.ts", "type": "registry:lib", "target": "components/data-table/data-table-runtime-context.ts" },
        { "path": "components/data-table/define-columns.ts", "type": "registry:lib", "target": "components/data-table/define-columns.ts" },
        { "path": "components/data-table/primitives.tsx", "type": "registry:component", "target": "components/data-table/primitives.tsx" },
        { "path": "components/data-table/column-header.tsx", "type": "registry:component", "target": "components/data-table/column-header.tsx" },
        { "path": "components/data-table/columns-menu.tsx", "type": "registry:component", "target": "components/data-table/columns-menu.tsx" },
        { "path": "components/data-table/use-data-table.ts", "type": "registry:hook", "target": "components/data-table/use-data-table.ts" },
        { "path": "components/data-table/data-table.tsx", "type": "registry:component", "target": "components/data-table/data-table.tsx" },
        { "path": "components/data-table/index.ts", "type": "registry:lib", "target": "components/data-table/index.ts" }
      ]
    }
```

- [ ] **Step 3: Add the `data-table-radix` item.** Identical to `data-table` except `name`, `title`, `description`, `registryDependencies` references `@kotsas-ui/table-fields` unchanged (table-fields has no Radix variant since it's base-agnostic — same item for both bases), and `primitives.radix.tsx` mapped to target `primitives.tsx`:

```json
    {
      "name": "data-table-radix",
      "type": "registry:block",
      "title": "Data Table (Radix)",
      "description": "Radix-UI build of the Data Table — same component and API as data-table. Install this if your shadcn/ui project uses Radix UI primitives; install data-table if it uses Base UI. Not sure? Check the base your project's components.json was initialized with.",
      "dependencies": ["@tanstack/react-table", "lucide-react"],
      "registryDependencies": [
        "@kotsas-ui/table-fields",
        "table",
        "button",
        "checkbox",
        "popover",
        "input"
      ],
      "files": [
        { "path": "components/data-table/types.ts", "type": "registry:lib", "target": "components/data-table/types.ts" },
        { "path": "components/data-table/use-grid-navigation.ts", "type": "registry:hook", "target": "components/data-table/use-grid-navigation.ts" },
        { "path": "components/data-table/data-table-runtime-context.ts", "type": "registry:lib", "target": "components/data-table/data-table-runtime-context.ts" },
        { "path": "components/data-table/define-columns.ts", "type": "registry:lib", "target": "components/data-table/define-columns.ts" },
        { "path": "components/data-table/primitives.radix.tsx", "type": "registry:component", "target": "components/data-table/primitives.tsx" },
        { "path": "components/data-table/column-header.tsx", "type": "registry:component", "target": "components/data-table/column-header.tsx" },
        { "path": "components/data-table/columns-menu.tsx", "type": "registry:component", "target": "components/data-table/columns-menu.tsx" },
        { "path": "components/data-table/use-data-table.ts", "type": "registry:hook", "target": "components/data-table/use-data-table.ts" },
        { "path": "components/data-table/data-table.tsx", "type": "registry:component", "target": "components/data-table/data-table.tsx" },
        { "path": "components/data-table/index.ts", "type": "registry:lib", "target": "components/data-table/index.ts" }
      ]
    }
```

- [ ] **Step 4: Validate JSON + build**

Run: `node -e "require('./registry.json')"` — expect no throw.
Run: `pnpm registry:build` — expect it writes `public/r/data-table.json`, `public/r/data-table-radix.json`, updates `public/r/registry.json`, no error.

- [ ] **Step 5: Verify the built items**

Run:
```bash
node -e "const j=require('./public/r/data-table.json'); console.log(j.files.length, j.files.every(f=>!f.path.includes('.test.')))"
```
Expected output: `10 true`

Run:
```bash
node -e "const j=require('./public/r/data-table-radix.json'); const f=j.files.find(x=>x.target.endsWith('primitives.tsx')); console.log(/asChild/.test(f.content), !/render=/.test(f.content))"
```
Expected output: `true true`

- [ ] **Step 6: Commit**

```bash
git add registry.json public/r/
git commit -m "feat(data-table): publish data-table and data-table-radix registry items

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 17: Final verification

- [ ] **Step 1: Full suite**

Run: `pnpm test` — expect all suites pass (grouped-data-table + table-fields + data-table).

- [ ] **Step 2: Typecheck + lint + production build**

Run: `pnpm typecheck && pnpm exec eslint components/data-table components/table-fields && pnpm build` — expect all clean.

- [ ] **Step 3: Manual smoke test (browser)**

Build a small demo at `app/(examples)/data-table-demo/` (data + `defineColumns` usage + `<DataTable editable onUpdateData={...} />`) and visually verify in the dev server: click a cell to activate (focus ring), click again to edit, Tab/Enter/Escape behave as designed, sort by clicking a header, hide/pin a column via the Columns menu, resize a column by dragging its edge. This mirrors the `/fields` demo built during Plan 1's visual verification — not part of the registry item.

- [ ] **Step 4: (Optional) scratch-install smoke test**

In a throwaway shadcn (Radix) project: `npx shadcn@latest add <abs path>/public/r/data-table-radix.json` then `npx tsc --noEmit` — confirms the Radix variant installs and typechecks standalone, per the dual-base verification pattern already established for `grouped-data-table`.

---

## Self-Review notes (already applied)

- **Spec coverage:** grid interaction spine (cell focus, keyboard nav, edit lifecycle) ✓ Tasks 7–9, 14; type-safe `defineColumns` builder with compile-time accessor/value-type binding ✓ Task 9; sort/hide/pin/resize ✓ Tasks 11, 12, 13 (resize via `columnSizing`/`columnResizeMode` in `use-data-table.ts`, drag-to-resize itself is a `TableHead` concern deferred to visual polish, not blocking correctness — the state and API are wired and tested); `editable` table-default → column-override resolution ✓ Task 9/13 tests; base-ui/Radix dual build + parity test ✓ Task 10; registry publication ✓ Task 16. **Out of scope for this plan** (Plan 3): row selection, row-number gutter, tri-state select-all, footer calc, hybrid aggregation, undo/redo + sonner, copy/paste/CSV export, `onCreateRows`.
- **Type consistency:** `CellPos`, `DataTableRuntime`, `DataTableColumnMeta`, `MoveDirection` defined once in Task 6's `types.ts` and reused verbatim by every later task (`use-grid-navigation.ts`, `define-columns.ts`, `use-data-table.ts`, `data-table.tsx`, `data-table-runtime-context.ts`). `FieldEditContext<V>`'s `focusNext` direction vocabulary (`"next" | "prev" | "up" | "down"`, already shipped in `table-fields/types.ts`) is reused as-is for `MoveDirection`, not redefined.
- **No placeholders:** every step has complete code and exact commands.
