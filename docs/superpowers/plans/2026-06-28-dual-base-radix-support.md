# Dual base-ui / Radix Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `grouped-data-table` registry component installable into both base-ui *and* Radix shadcn projects, without forking the whole component.

**Architecture:** The only base-ui-specific code lives at a handful of primitive call-sites (two patterns: `<PopoverTrigger render=…>` and `<Select items=…>`). We isolate those behind a thin internal shim (`primitives.tsx`) exposing two normalized components — `FieldSelect` and `PopoverButtonTrigger`. We ship two variants of *only that file*: `primitives.tsx` (base-ui, the version our own app compiles against) and `primitives.radix.tsx` (Radix, distribution-only, excluded from local typecheck). The registry exposes two items — `grouped-data-table` (base-ui) and `grouped-data-table-radix` (Radix) — that share every file except which primitives variant maps to `primitives.tsx`. shadcn's CLI already resolves the underlying `button`/`select`/`popover` primitives to the consumer's configured base automatically; isolating our own two call-site patterns is the only missing piece.

**Tech Stack:** Next.js 16, React 18+, TypeScript (strict), TanStack Table v8, shadcn (base-ui `base-vega` locally), Vitest + Testing Library + jsdom, shadcn registry CLI (`shadcn build`).

---

## File Structure

**New files:**
- `components/grouped-data-table/primitives.tsx` — base-ui shim: `FieldSelect`, `PopoverButtonTrigger`, `SelectOption`. This is what the repo's app imports and what the **base-ui** registry item ships.
- `components/grouped-data-table/primitives.radix.tsx` — Radix shim: identical exports/API, Radix primitive calls. Distribution-only; never imported in-repo; excluded from `tsc` via `**/*.radix.tsx`.
- `components/grouped-data-table/primitives.test.tsx` — tests for the base shim (trigger renders with its accessible name; FieldSelect renders without throwing).

**Modified files:**
- `components/grouped-data-table/filter-builder.tsx` — replace the 3 inline `Select`s + the `FilterPopover` trigger with the shim.
- `components/grouped-data-table/multi-select.tsx` — replace the `PopoverTrigger render=` with `PopoverButtonTrigger`.
- `components/grouped-data-table/dimension-picker.tsx` — replace the `PopoverTrigger render=` with `PopoverButtonTrigger`.
- `tsconfig.json` — add `**/*.radix.tsx` to `exclude`.
- `registry.json` — add `primitives.tsx` to the base item; add a second `grouped-data-table-radix` item.
- `public/r/grouped-data-table.json`, `public/r/grouped-data-table-radix.json`, `public/r/registry.json` — rebuilt output (committed).
- `app/docs/page.tsx` — document the Radix install path; soften the base-ui-only callout.

**Untouched (already base-agnostic):** `types.ts`, `filter-utils.ts`, `grouping-utils.ts`, `use-grouped-table.ts`, `group-cell.tsx`, `grouped-data-table.tsx`, `index.ts`.

---

## Task 1: Create the base-ui primitive shim (TDD)

**Files:**
- Create: `components/grouped-data-table/primitives.tsx`
- Test: `components/grouped-data-table/primitives.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/grouped-data-table/primitives.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Popover, PopoverContent } from "@/components/ui/popover"
import { FieldSelect, PopoverButtonTrigger } from "./primitives"

describe("FieldSelect", () => {
  it("renders a trigger with the given accessible name", () => {
    render(
      <FieldSelect
        ariaLabel="Pick fruit"
        value="apple"
        items={[
          { value: "apple", label: "Apple" },
          { value: "banana", label: "Banana" },
        ]}
        onValueChange={vi.fn()}
      />,
    )
    expect(screen.getByLabelText("Pick fruit")).toBeInTheDocument()
  })
})

describe("PopoverButtonTrigger", () => {
  it("renders a labeled button trigger with its children", () => {
    render(
      <Popover>
        <PopoverButtonTrigger ariaLabel="Open menu">Group by</PopoverButtonTrigger>
        <PopoverContent>hidden</PopoverContent>
      </Popover>,
    )
    const trigger = screen.getByLabelText("Open menu")
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent("Group by")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/grouped-data-table/primitives.test.tsx`
Expected: FAIL — `Failed to resolve import "./primitives"` (file does not exist yet).

- [ ] **Step 3: Write the shim**

Create `components/grouped-data-table/primitives.tsx`:

```tsx
"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SelectOption = { value: string; label: string }

export type FieldSelectProps = {
  value: string
  items: SelectOption[]
  onValueChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
  size?: "sm" | "default"
  className?: string
}

/**
 * Single-select normalized across base-ui / Radix. The base-ui build passes the
 * required `items` prop to the Select root and guards the nullable onValueChange;
 * the Radix build (primitives.radix.tsx) omits `items`. Callers never touch the
 * primitive Select API directly, so the rest of the component is base-agnostic.
 */
export function FieldSelect({
  value,
  items,
  onValueChange,
  ariaLabel,
  placeholder,
  size = "sm",
  className,
}: FieldSelectProps) {
  return (
    <Select
      value={value}
      items={items}
      onValueChange={(v) => v != null && onValueChange(String(v))}
    >
      <SelectTrigger aria-label={ariaLabel} size={size} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

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

Run: `pnpm exec vitest run components/grouped-data-table/primitives.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no output (exit 0).

- [ ] **Step 6: Commit**

```bash
git add components/grouped-data-table/primitives.tsx components/grouped-data-table/primitives.test.tsx
git commit -m "feat: add base-agnostic primitives shim (FieldSelect, PopoverButtonTrigger)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Refactor filter-builder.tsx onto the shim

**Files:**
- Modify: `components/grouped-data-table/filter-builder.tsx`
- Test: `components/grouped-data-table/filter-builder.test.tsx` (existing — must stay green)

- [ ] **Step 1: Swap the primitive imports**

In `components/grouped-data-table/filter-builder.tsx`, replace the `Popover`/`Select` import block (currently lines 9–22, the imports from `@/components/ui/popover`, `@/components/ui/select`, and `./multi-select`) with:

```tsx
import { Popover, PopoverContent } from "@/components/ui/popover"

import { FieldSelect, PopoverButtonTrigger } from "./primitives"
import { MultiSelect } from "./multi-select"
```

(Removes the now-unused `PopoverTrigger`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` imports.)

- [ ] **Step 2: Replace `CombinatorSelect`**

Replace the whole `CombinatorSelect` function (currently lines 68–91) with:

```tsx
function CombinatorSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: Combinator
  onChange: (next: Combinator) => void
  ariaLabel: string
}) {
  return (
    <FieldSelect
      value={value}
      items={COMBINATOR_OPTIONS}
      onValueChange={(v) => onChange(v as Combinator)}
      ariaLabel={ariaLabel}
      className="w-20 text-xs"
    />
  )
}
```

- [ ] **Step 3: Replace the `select`-type branch in `ConditionValueInput`**

In `ConditionValueInput`, replace the non-multi `return (<Select …>…</Select>)` block (the second `if (def.type === "select" …)` return, currently lines 119–136) with:

```tsx
    return (
      <FieldSelect
        value={condition.value == null ? "" : String(condition.value)}
        items={def.options}
        onValueChange={(v) => onValueChange(v)}
        ariaLabel={ariaLabel}
        placeholder="Select…"
        className="h-8 w-full"
      />
    )
```

(Leave the `isAnyOf`/`isNoneOf` `MultiSelect` branch and the numeric/date/between branches unchanged.)

- [ ] **Step 4: Replace the column + operator selects in `ConditionRow`**

In `ConditionRow`, replace the two `<Select>…</Select>` blocks (column select currently lines 199–214, operator select currently lines 215–230) with:

```tsx
      <FieldSelect
        value={condition.columnId}
        items={filterableColumns.map((d) => ({ value: d.id, label: d.label }))}
        onValueChange={(v) => update(withColumn(condition, v, filterableColumns))}
        ariaLabel="Filter column"
        className="h-8 w-28"
      />
      <FieldSelect
        value={condition.operator}
        items={operators.map((op) => ({ value: op, label: OPERATOR_LABELS[op] }))}
        onValueChange={(v) => update(withOperator(condition, v as FilterOperator))}
        ariaLabel="Filter operator"
        className="h-8 w-32"
      />
```

- [ ] **Step 5: Replace the `FilterPopover` trigger**

Replace the `FilterPopover` function (currently lines 354–368) with:

```tsx
export function FilterPopover(props: FilterBuilderProps) {
  const count = countActiveConditions(props.filterState)
  return (
    <Popover>
      <PopoverButtonTrigger className="gap-2">
        <Filter className="size-4" />
        Filters
        {count > 0 && <Badge variant="secondary">{count}</Badge>}
      </PopoverButtonTrigger>
      <PopoverContent align="start" className="w-[34rem]">
        <FilterBuilderContent {...props} />
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 6: Run the existing filter-builder tests**

Run: `pnpm exec vitest run components/grouped-data-table/filter-builder.test.tsx`
Expected: PASS. The accessible names (`Filter column`, `Filter operator`, `Filter value for …`, `Combine groups with`, `Combine conditions with`) and the `Filters` trigger text are all preserved, so any name/role queries still resolve. If a test fails because it queried a raw `Select`/`SelectTrigger` DOM structure, update that assertion to query by the preserved accessible name (`getByLabelText`) rather than internal structure.

- [ ] **Step 7: Typecheck**

Run: `pnpm typecheck`
Expected: no output (exit 0).

- [ ] **Step 8: Commit**

```bash
git add components/grouped-data-table/filter-builder.tsx components/grouped-data-table/filter-builder.test.tsx
git commit -m "refactor: route filter-builder selects/trigger through primitives shim

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Refactor multi-select.tsx onto the shim

**Files:**
- Modify: `components/grouped-data-table/multi-select.tsx`
- Test: `components/grouped-data-table/multi-select.test.tsx` (existing — must stay green)

- [ ] **Step 1: Swap imports**

In `components/grouped-data-table/multi-select.tsx`, replace the import block (currently lines 3–12) with:

```tsx
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent } from "@/components/ui/popover"

import { PopoverButtonTrigger } from "./primitives"
```

(Removes the unused `Button` and `PopoverTrigger` imports; `Checkbox` is still used by `MultiSelectContent`.)

- [ ] **Step 2: Replace the trigger in `MultiSelect`**

Replace the `<PopoverTrigger render={…}>…</PopoverTrigger>` block (currently lines 71–87) with:

```tsx
      <PopoverButtonTrigger
        ariaLabel={ariaLabel}
        className={cn("h-8 justify-between gap-2 font-normal", className)}
      >
        <span className={cn(selected.length === 0 && "text-muted-foreground")}>
          {multiSelectLabel(selected, placeholder)}
        </span>
        <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden="true" />
      </PopoverButtonTrigger>
```

(Leave `MultiSelectContent`, `multiSelectLabel`, the `Popover`/`PopoverContent` wrapper, and the prop types unchanged.)

- [ ] **Step 3: Run the existing multi-select tests**

Run: `pnpm exec vitest run components/grouped-data-table/multi-select.test.tsx`
Expected: PASS. The trigger's `aria-label` and `N selected` text are preserved.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no output (exit 0).

- [ ] **Step 5: Commit**

```bash
git add components/grouped-data-table/multi-select.tsx
git commit -m "refactor: route multi-select trigger through primitives shim

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Refactor dimension-picker.tsx onto the shim

**Files:**
- Modify: `components/grouped-data-table/dimension-picker.tsx`
- Test: `components/grouped-data-table/dimension-picker.test.tsx` (existing — must stay green)

- [ ] **Step 1: Swap imports**

In `components/grouped-data-table/dimension-picker.tsx`, the `Badge` import (line 25) stays as-is. Replace the `Button` import (line 26) and the `Popover` import block (currently lines 27–31) — i.e. lines 26–31 — with:

```tsx
import { Popover, PopoverContent } from "@/components/ui/popover"

import { PopoverButtonTrigger } from "./primitives"
```

(Removes the now-unused `Button` and `PopoverTrigger` imports. Do **not** re-import `Badge` — it is already imported on line 25.)

- [ ] **Step 2: Replace the trigger in `DimensionPicker`**

Replace the `<PopoverTrigger render={…}>…</PopoverTrigger>` block (currently lines 191–201) with:

```tsx
      <PopoverButtonTrigger className="gap-2">
        <Layers className="size-4" />
        Group by
        {props.grouping.length > 0 && (
          <Badge variant="secondary">{props.grouping.length}</Badge>
        )}
      </PopoverButtonTrigger>
```

(Leave `SortableDimension`, `DimensionPickerContent`, `reorderGrouping`, the dnd-kit code, and the `SortableContext items={grouping}` prop — which is dnd-kit, not base-ui — unchanged.)

- [ ] **Step 3: Run the existing dimension-picker tests**

Run: `pnpm exec vitest run components/grouped-data-table/dimension-picker.test.tsx`
Expected: PASS. The `Group by` trigger text and drag/hierarchy behavior are unchanged.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no output (exit 0).

- [ ] **Step 5: Commit**

```bash
git add components/grouped-data-table/dimension-picker.tsx
git commit -m "refactor: route dimension-picker trigger through primitives shim

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Add the Radix variant + exclude it from local typecheck

**Files:**
- Create: `components/grouped-data-table/primitives.radix.tsx`
- Modify: `tsconfig.json:34` (the `exclude` array)

- [ ] **Step 1: Exclude `*.radix.tsx` from typecheck FIRST**

In `tsconfig.json`, change the `exclude` line:

```json
  "exclude": ["node_modules", "**/*.radix.tsx"]
```

(Do this before creating the file, so the Radix variant — which references Radix APIs that don't exist on the repo's base-ui primitives — never breaks `pnpm typecheck` or `next build`. It is distribution-only and validated separately in Task 8.)

- [ ] **Step 2: Create the Radix variant**

Create `components/grouped-data-table/primitives.radix.tsx` with the identical public API as the base shim, using Radix call conventions (`asChild` instead of `render`; no `items` prop on `Select`):

```tsx
"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SelectOption = { value: string; label: string }

export type FieldSelectProps = {
  value: string
  items: SelectOption[]
  onValueChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
  size?: "sm" | "default"
  className?: string
}

/** Radix build of the FieldSelect shim — see primitives.tsx for the base-ui build. */
export function FieldSelect({
  value,
  items,
  onValueChange,
  ariaLabel,
  placeholder,
  size = "sm",
  className,
}: FieldSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(String(v))}>
      <SelectTrigger aria-label={ariaLabel} size={size} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

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

- [ ] **Step 3: Confirm the variant is excluded from typecheck**

Run: `pnpm typecheck`
Expected: no output (exit 0) — `primitives.radix.tsx` is NOT compiled (it would otherwise error on `asChild` / missing `items` against the base-ui primitives).

- [ ] **Step 4: Confirm tests still pass (variant is ignored by the test glob)**

Run: `pnpm test`
Expected: all suites PASS. `primitives.radix.tsx` is not a `*.test.tsx` file, so Vitest never loads it.

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json components/grouped-data-table/primitives.radix.tsx
git commit -m "feat: add Radix variant of the primitives shim (distribution-only)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Wire both registry items and rebuild

**Files:**
- Modify: `registry.json`
- Rebuild: `public/r/grouped-data-table.json`, `public/r/grouped-data-table-radix.json`, `public/r/registry.json`

- [ ] **Step 1: Add `primitives.tsx` to the base item's `files`**

In `registry.json`, inside the existing `grouped-data-table` item's `files` array, add this entry immediately before the `multi-select.tsx` entry (so the shim it depends on is listed first — ordering is cosmetic for shadcn but keeps the dependency readable):

```json
        {
          "path": "components/grouped-data-table/primitives.tsx",
          "type": "registry:component",
          "target": "components/grouped-data-table/primitives.tsx"
        },
```

- [ ] **Step 2: Add the second `grouped-data-table-radix` item**

In `registry.json`, add a second object to the top-level `items` array (after the existing item). It is identical to the base item except: the `name`, the `description`, and `primitives.radix.tsx` mapped to the `primitives.tsx` target:

```json
    {
      "name": "grouped-data-table-radix",
      "type": "registry:block",
      "title": "Grouped Data Table (Radix)",
      "description": "Radix-UI build of the Grouped Data Table. Same component and API as grouped-data-table, for shadcn projects initialized with the default Radix primitives (npx shadcn init --base radix).",
      "dependencies": [
        "@tanstack/react-table",
        "@dnd-kit/core",
        "@dnd-kit/sortable",
        "@dnd-kit/modifiers",
        "@dnd-kit/utilities",
        "lucide-react"
      ],
      "registryDependencies": [
        "table",
        "button",
        "badge",
        "checkbox",
        "popover",
        "select",
        "input"
      ],
      "files": [
        {
          "path": "components/grouped-data-table/types.ts",
          "type": "registry:lib",
          "target": "components/grouped-data-table/types.ts"
        },
        {
          "path": "components/grouped-data-table/grouping-utils.ts",
          "type": "registry:lib",
          "target": "components/grouped-data-table/grouping-utils.ts"
        },
        {
          "path": "components/grouped-data-table/filter-utils.ts",
          "type": "registry:lib",
          "target": "components/grouped-data-table/filter-utils.ts"
        },
        {
          "path": "components/grouped-data-table/use-grouped-table.ts",
          "type": "registry:hook",
          "target": "components/grouped-data-table/use-grouped-table.ts"
        },
        {
          "path": "components/grouped-data-table/primitives.radix.tsx",
          "type": "registry:component",
          "target": "components/grouped-data-table/primitives.tsx"
        },
        {
          "path": "components/grouped-data-table/multi-select.tsx",
          "type": "registry:component",
          "target": "components/grouped-data-table/multi-select.tsx"
        },
        {
          "path": "components/grouped-data-table/group-cell.tsx",
          "type": "registry:component",
          "target": "components/grouped-data-table/group-cell.tsx"
        },
        {
          "path": "components/grouped-data-table/dimension-picker.tsx",
          "type": "registry:component",
          "target": "components/grouped-data-table/dimension-picker.tsx"
        },
        {
          "path": "components/grouped-data-table/filter-builder.tsx",
          "type": "registry:component",
          "target": "components/grouped-data-table/filter-builder.tsx"
        },
        {
          "path": "components/grouped-data-table/grouped-data-table.tsx",
          "type": "registry:component",
          "target": "components/grouped-data-table/grouped-data-table.tsx"
        },
        {
          "path": "components/grouped-data-table/index.ts",
          "type": "registry:lib",
          "target": "components/grouped-data-table/index.ts"
        }
      ]
    }
```

- [ ] **Step 3: Rebuild the registry**

Run: `pnpm registry:build`
Expected: builds without error; writes `public/r/grouped-data-table.json`, `public/r/grouped-data-table-radix.json`, and `public/r/registry.json`.

- [ ] **Step 4: Verify the built Radix file maps the variant correctly**

Run: `node -e "const j=require('./public/r/grouped-data-table-radix.json'); const f=j.files.find(x=>x.target&&x.target.endsWith('primitives.tsx')); console.log(f.target); console.log(/asChild/.test(f.content), !/items=\{items\}/.test(f.content))"`
Expected output:
```
components/grouped-data-table/primitives.tsx
true true
```
(The file targeted at `primitives.tsx` contains the Radix `asChild` build and does **not** contain the base-ui `items={items}` Select call.)

- [ ] **Step 5: Verify the base file still ships the base variant**

Run: `node -e "const j=require('./public/r/grouped-data-table.json'); const f=j.files.find(x=>x.target&&x.target.endsWith('primitives.tsx')); console.log(/render=/.test(f.content), /items=\{items\}/.test(f.content))"`
Expected output:
```
true true
```

- [ ] **Step 6: Commit**

```bash
git add registry.json public/r/
git commit -m "feat: publish grouped-data-table-radix registry item

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Document the Radix install path

**Files:**
- Modify: `app/docs/page.tsx`

- [ ] **Step 1: Add Radix install constants**

In `app/docs/page.tsx`, just after the existing `NAMESPACE_CMD` constant (line 27), add:

```tsx
const INSTALL_RADIX_URL =
  "npx shadcn@latest add https://ui.kotsas.com/r/grouped-data-table-radix.json"

const NAMESPACE_RADIX_CMD = "npx shadcn@latest add @kotsas-ui/grouped-data-table-radix"
```

- [ ] **Step 2: Soften the base-ui callout to mention the Radix variant**

In the Installation section, replace the callout paragraph (the `<p className="text-muted-foreground">` inside the amber `TriangleAlert` callout, currently lines 109–114) with:

```tsx
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Two builds.</span>{" "}
              The default <code className="font-mono text-foreground">grouped-data-table</code>{" "}
              targets a base-ui shadcn setup
              (<code className="font-mono text-foreground">npx shadcn@latest init --base base-ui</code>).
              If your project uses the default Radix primitives instead, install{" "}
              <code className="font-mono text-foreground">grouped-data-table-radix</code> (below) —
              same component and API.
            </p>
```

- [ ] **Step 3: Add a Radix install block**

In the Installation section, immediately after the `<CodeBlock code={NAMESPACE_CMD} />` line (line 126), add:

```tsx
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Radix projects:</span> install the
            Radix build instead (by URL or namespace):
          </p>
          <CodeBlock code={INSTALL_RADIX_URL} />
          <CodeBlock code={NAMESPACE_RADIX_CMD} />
```

- [ ] **Step 4: Typecheck + build the docs route**

Run: `pnpm typecheck && pnpm build`
Expected: typecheck clean; `next build` compiles all routes including `/docs` with no errors.

- [ ] **Step 5: Commit**

```bash
git add app/docs/page.tsx
git commit -m "docs: document the Radix install path for grouped-data-table

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Verify the Radix build installs and compiles in a real Radix project

This is the real validation of the Radix variant — it can't be typechecked in this repo (the repo is base-ui), so we compile it against actual Radix shadcn primitives in a throwaway project. Requires network access.

**Files:** none in this repo (scratch project under `/tmp`).

- [ ] **Step 1: Scaffold a Radix shadcn project**

```bash
rm -rf /tmp/kotsas-radix-check
mkdir -p /tmp/kotsas-radix-check
cd /tmp/kotsas-radix-check
npx shadcn@latest init --template vite -d --base radix
```
Expected: a Vite + React + Tailwind project with `components.json` whose base is Radix, `cn()` util, and the shadcn primitives configured.

- [ ] **Step 2: Install the Radix item from the locally built JSON**

```bash
cd /tmp/kotsas-radix-check
npx shadcn@latest add /Users/gianniskotsas/Documents/WebDev/react-pivot-table/public/r/grouped-data-table-radix.json
```
Expected: installs `components/grouped-data-table/*` (including `primitives.tsx` from the Radix variant), adds the npm `dependencies`, and pulls the Radix `button`/`select`/`popover`/`table`/`badge`/`checkbox`/`input` primitives.

- [ ] **Step 3: Typecheck the scratch project against real Radix primitives**

```bash
cd /tmp/kotsas-radix-check
npx tsc --noEmit
```
Expected: exit 0. No errors about `render`, `asChild`, `items`, or `nativeButton`. If `tsc` errors on `SelectTrigger` not accepting `size`, or any other Radix API mismatch, fix `components/grouped-data-table/primitives.radix.tsx` in THIS repo, re-run `pnpm registry:build`, re-commit (amend Task 6's commit or add a fix commit), then redo Steps 2–3 here.

- [ ] **Step 4: Smoke-render (optional, if the scratch project has a dev server)**

```bash
cd /tmp/kotsas-radix-check
# Wire <GroupedDataTable> into src/App.tsx with a tiny dataset per app/docs USAGE snippet, then:
npm run build
```
Expected: production build succeeds, proving the Radix variant renders without runtime import errors.

- [ ] **Step 5: Clean up**

```bash
rm -rf /tmp/kotsas-radix-check
```

No commit (no repo files changed unless Step 3 required a fix, which is committed in this repo).

---

## Task 9: Final full verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: all suites PASS.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no output (exit 0).

- [ ] **Step 3: Production build**

Run: `pnpm build`
Expected: all routes compile (`/`, `/docs`, `/examples`, `/accounts`).

- [ ] **Step 4: Browser smoke-test the base-ui app**

With `pnpm dev` running, load `/` and `/examples`; open the Filters and Group by popovers and confirm the operator/value selects render readable labels and the popovers open. Confirm **0 console errors**. (This proves the base-ui refactor preserved behavior end-to-end.)

- [ ] **Step 5: Push**

```bash
git push origin main
```
(Auto-deploys to Vercel; the new `grouped-data-table-radix.json` becomes available at `https://ui.kotsas.com/r/grouped-data-table-radix.json`.)

---

## Notes / Known Risks

- **`SelectTrigger size` on Radix:** current shadcn (new-york, Radix) `SelectTrigger` accepts `size?: "sm" | "default"`. Task 8 Step 3 is where this is confirmed against real Radix primitives; if an older Radix Select lacks `size`, drop the `size` prop from `primitives.radix.tsx`'s `SelectTrigger` and express height via `className` instead.
- **`{style}` auto-resolution not used:** we deliberately ship two explicitly-named items rather than relying on shadcn's `{style}` URL placeholder, because that placeholder keys on `config.style`, not on the base-ui/Radix `base` choice — two named items is the reliable mechanism and keeps the install command explicit.
- **`primitives.radix.tsx` is never imported in-repo** and is excluded from `tsc` — it exists purely so `shadcn build` can inline it into the Radix registry JSON.
```
