# Kotsas UI — Grouped Data Table

An AG-Grid-style **row-grouping / drill-down** data table for React, built on
[TanStack Table v8](https://tanstack.com/table) and shadcn/ui (base-ui), distributed as a
**shadcn registry** component.

**Live demo:** https://react-pivot-table.vercel.app/accounts

## Features

- Single auto **Group column** with indented hierarchy, expand/collapse, and per-group counts.
- **Drag-and-drop dimension picker** (multi-select dropdown + reorderable hierarchy).
- **AND/OR filter groups** (Airtable-style): two-level groups with human-readable operators
  (`is`, `is not`, `contains`, `does not contain`, `is any of`, `is none of`, `greater than`, …),
  a multi-select value control, and live filtering that recomputes group counts/aggregations.
- Declarative leaf rendering: `leaf: { primary, icon?, secondary? }` (icon and secondary line
  optional), or a full-control `renderLeaf` escape hatch.
- Optional aggregations per column; pagination; fully generic over your row type `<TData>`.

## Install

> **Requirement:** your project must be a **base-ui** shadcn setup
> (`npx shadcn@latest init --base base-ui`). The component uses base-ui primitive APIs.

```bash
# from the hosted registry
npx shadcn@latest add https://react-pivot-table.vercel.app/r/grouped-data-table.json

# …or from GitHub raw
npx shadcn@latest add https://raw.githubusercontent.com/gianniskotsas/react-pivot-table/main/public/r/grouped-data-table.json
```

Or add the namespace to your `components.json` and install by alias:

```json
{
  "registries": {
    "@kotsas-ui": "https://react-pivot-table.vercel.app/r/{name}.json"
  }
}
```

```bash
npx shadcn@latest add @kotsas-ui/grouped-data-table
```

This pulls the component files into `components/grouped-data-table/`, installs the npm
dependencies (`@tanstack/react-table`, `@dnd-kit/*`, `lucide-react`), and adds the required
shadcn primitives (`table`, `button`, `badge`, `checkbox`, `popover`, `select`, `input`).

## Usage

```tsx
import { GroupedDataTable } from "@/components/grouped-data-table"

<GroupedDataTable
  data={data}
  columns={columns}
  groupableDimensions={[{ id: "entity", label: "Entity" }, { id: "bank", label: "Bank" }]}
  initialGrouping={["entity", "bank"]}
  filterableColumns={[
    { id: "bank", label: "Bank", type: "select", options },
    { id: "balance", label: "Balance", type: "number" },
  ]}
  groupColumn={{
    header: "Account",
    leaf: {
      primary: (row) => row.original.accountName,
      icon: () => <Landmark className="size-4" />, // optional
      secondary: (row) => row.original.iban,        // optional
    },
  }}
/>
```

See `app/(examples)/accounts/` for a complete working example.

## Maintaining the registry

```bash
pnpm registry:build   # rebuild public/r/*.json from registry.json after changing the component
```

Push to `main` to redeploy the hosted registry on Vercel.
