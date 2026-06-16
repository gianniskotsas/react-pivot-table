import { renderHook, act } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ColumnDef } from "@tanstack/react-table"

import { useGroupedTable } from "./use-grouped-table"
import { GROUP_COLUMN_ID } from "./types"

type Acct = { id: string; entity: string; bank: string; currency: string }

const data: Acct[] = [
  { id: "1", entity: "Coffee Inc", bank: "Citi", currency: "USD" },
  { id: "2", entity: "Coffee Inc", bank: "HSBC", currency: "EUR" },
  { id: "3", entity: "Holding BV", bank: "HSBC", currency: "EUR" },
]

const columns: ColumnDef<Acct, unknown>[] = [
  { id: "entity", accessorKey: "entity", enableGrouping: true },
  { id: "bank", accessorKey: "bank", enableGrouping: true },
  { id: "currency", accessorKey: "currency" },
]

function setup(initialGrouping?: string[]) {
  return renderHook(() =>
    useGroupedTable<Acct>({
      data,
      columns,
      groupableDimensions: [
        { id: "entity", label: "Entity" },
        { id: "bank", label: "Bank" },
      ],
      groupColumn: { renderLeaf: (row) => row.original.id },
      initialGrouping,
      enablePagination: false,
    }),
  )
}

describe("useGroupedTable", () => {
  it("prepends a synthesized group column", () => {
    const { result } = setup()
    const ids = result.current.table.getAllColumns().map((c) => c.id)
    expect(ids[0]).toBe(GROUP_COLUMN_ID)
  })

  it("hides grouped dimension columns and groups the rows", () => {
    const { result } = setup(["entity"])
    expect(result.current.table.getColumn("entity")?.getIsVisible()).toBe(false)
    // Top-level rows are the two entity groups.
    expect(result.current.table.getRowModel().rows.length).toBe(2)
    expect(result.current.table.getRowModel().rows[0].getIsGrouped()).toBe(true)
  })

  it("setGrouping ignores ids that are not groupable dimensions", () => {
    const { result } = setup()
    act(() => result.current.setGrouping(["bank", "ghost"]))
    expect(result.current.grouping).toEqual(["bank"])
  })

  it("re-groups the row model after setGrouping is called", () => {
    const { result } = setup()
    expect(result.current.table.getRowModel().rows[0].getIsGrouped()).toBe(false)
    act(() => result.current.setGrouping(["bank"]))
    expect(result.current.table.getColumn("bank")?.getIsVisible()).toBe(false)
    const rows = result.current.table.getRowModel().rows
    expect(rows.every((row) => row.getIsGrouped())).toBe(true)
    // 2 distinct banks in the fixture (Citi, HSBC).
    expect(rows.length).toBe(2)
  })
})
