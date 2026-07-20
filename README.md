# Kotsas UI — Data Table

A type-safe, editable data table for React, built on
[TanStack Table v8](https://tanstack.com/table) and shadcn/ui (base-ui), distributed as a
**shadcn registry** component. Grouping/drill-down is an opt-in `grouping` prop — no separate
component required.

**Live demo:** https://kotsas-ui.vercel.app/accounts

## Features

- Grid keyboard navigation, inline cell editing, sortable/hideable/freezable/resizable columns.
- Opt-in row grouping: a single auto **Group column** with indented hierarchy, expand/collapse,
  and per-group counts — pass a `grouping` prop, omit it for a flat table.
- **AND/OR filter groups** (Airtable-style): two-level groups with human-readable operators
  (`is`, `is not`, `contains`, `does not contain`, `is any of`, `is none of`, `greater than`, …),
  a multi-select value control, and live filtering that recomputes group counts/aggregations.
- Declarative group-leaf rendering: `leaf: { primary, icon?, secondary? }` (icon and secondary
  line optional), or a full-control `renderLeaf` escape hatch.
- Optional aggregations per column; pagination; fully generic over your row type `<TData>`.

## Install

> **Requirement:** your project must be a **base-ui** shadcn setup
> (`npx shadcn@latest init --base base-ui`). The component uses base-ui primitive APIs.

```bash
# from the hosted registry
npx shadcn@latest add https://ui.kotsas.com/r/data-table.json

# …or from GitHub raw
npx shadcn@latest add https://raw.githubusercontent.com/gianniskotsas/kotsas-ui/main/public/r/data-table.json
```

Or add the namespace to your `components.json` and install by alias:

```json
{
  "registries": {
    "@kotsas-ui": "https://ui.kotsas.com/r/{name}.json"
  }
}
```

```bash
npx shadcn@latest add @kotsas-ui/data-table
```

This pulls the component files into `components/data-table/`, installs the npm
dependencies (`@tanstack/react-table`, `lucide-react`, `sonner`), and adds the required
shadcn primitives (`table`, `button`, `badge`, `checkbox`, `popover`, `select`, `input`, `sonner`).

## Usage

```tsx
import { DataTable } from "@/components/data-table"

<DataTable
  data={data}
  columns={columns}
  filterableColumns={[
    { id: "bank", label: "Bank", type: "select", options },
    { id: "balance", label: "Balance", type: "number" },
  ]}
/>
```

## Grouping

Pass a `grouping` prop to turn on AG-Grid-style row grouping/drill-down. Omit it entirely for a
flat table — no grouping state, no group column, no behaviour change.

```tsx
import { DataTable } from "@/components/data-table"

<DataTable
  data={data}
  columns={columns}
  grouping={{
    dimensions: [{ id: "entity", label: "Entity" }, { id: "bank", label: "Bank" }],
    initial: ["entity", "bank"],
    column: {
      header: "Account",
      leaf: {
        primary: (row) => row.original.accountName,
        icon: () => <Landmark className="size-4" />, // optional
        secondary: (row) => row.original.iban,        // optional
      },
    },
  }}
/>
```

To let users change the hierarchy at runtime, install the optional
`@kotsas-ui/dimension-picker` block (the only piece that depends on dnd-kit) and pass its
`<DimensionPicker />` as `grouping.renderControl`:

```bash
npx shadcn@latest add @kotsas-ui/dimension-picker
```

```tsx
import { DimensionPicker } from "@/components/dimension-picker"

<DataTable
  data={data}
  columns={columns}
  grouping={{
    dimensions: [{ id: "entity", label: "Entity" }, { id: "bank", label: "Bank" }],
    initial: ["entity"],
    column: { header: "Account", leaf: { primary: (row) => row.original.accountName } },
    renderControl: ({ dimensions, grouping, setGrouping }) => (
      <DimensionPicker
        dimensions={dimensions}
        grouping={grouping}
        onGroupingChange={setGrouping}
      />
    ),
  }}
/>
```

`@kotsas-ui/grouped-data-table` (the standalone grouping component) is **deprecated** — it's now
a thin wrapper around `DataTable`'s `grouping` prop, kept for one migration release. New projects
should install `@kotsas-ui/data-table` directly. One behaviour difference to note when migrating:
the wrapper now renders a Columns menu that `GroupedDataTable` never had, because `DataTable`
renders that menu unconditionally — it lets users unhide grouped dimension columns, and was kept
intentionally rather than adding a new prop just to suppress it.

See `app/(examples)/accounts/` for a complete working example.

## Maintaining the registry

```bash
pnpm registry:build   # rebuild public/r/*.json from registry.json after changing the component
```

Push to `main` to redeploy the hosted registry on Vercel.
