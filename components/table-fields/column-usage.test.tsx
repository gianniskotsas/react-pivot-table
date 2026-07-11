import type { ColumnDef } from "@tanstack/react-table"
import { describe, expect, it } from "vitest"
import {
  buttonCell,
  currencyCell,
  dateCell,
  ratingCell,
  singleSelectCell,
  urlCell,
} from "./index"

type Row = { salary: number; rating: number; dept: string; when: string; site: string }

// Compile-time guard (I1): the standalone cells must slot into the canonical
// ColumnDef<T>[] + accessorKey pattern that shadcn's data-table docs use.
// If a *Cell return type regresses, `pnpm typecheck` fails on this file.
const columns: ColumnDef<Row>[] = [
  { accessorKey: "salary", cell: currencyCell<Row>({ currency: "USD" }) },
  { accessorKey: "rating", cell: ratingCell<Row>() },
  { accessorKey: "dept", cell: singleSelectCell<Row>({ options: [{ label: "Eng", value: "eng" }] }) },
  { accessorKey: "when", cell: dateCell<Row>() },
  { accessorKey: "site", cell: urlCell<Row>() },
  { id: "actions", cell: buttonCell<Row>({ label: "Open", onClick: () => {} }) },
]

describe("standalone cells in ColumnDef<T>[]", () => {
  it("compiles the canonical column array (typecheck is the real assertion)", () => {
    expect(columns).toHaveLength(6)
  })
})
