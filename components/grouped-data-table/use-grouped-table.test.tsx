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

  it("pre-filters rows from initialFilterState and recomputes groups", () => {
    const { result } = renderHook(() =>
      useGroupedTable<Acct>({
        data, columns,
        groupableDimensions: [{ id: "entity", label: "Entity" }],
        groupColumn: { renderLeaf: (row) => row.original.id },
        initialGrouping: ["entity"],
        enablePagination: false,
        filterableColumns: [{ id: "currency", label: "Ccy", type: "select" }],
        initialFilterState: { combinator: "and", groups: [
          { id: "g1", combinator: "and", conditions: [
            { id: "f1", columnId: "currency", operator: "is", value: "EUR" },
          ] },
        ] },
      }),
    )
    const leafCount = result.current.table.getRowModel().rows
      .flatMap((r) => r.getLeafRows()).filter((r) => !r.getIsGrouped()).length
    expect(leafCount).toBe(2) // ids 2 and 3 are EUR
  })

  it("an OR group keeps rows matching either condition", () => {
    const { result } = renderHook(() =>
      useGroupedTable<Acct>({
        data,
        columns,
        groupableDimensions: [{ id: "entity", label: "Entity" }],
        groupColumn: { renderLeaf: (row) => row.original.id },
        enablePagination: false,
        filterableColumns: [
          { id: "currency", label: "Ccy", type: "select" },
          { id: "bank", label: "Bank", type: "select" },
        ],
        initialFilterState: {
          combinator: "and",
          groups: [
            { id: "g1", combinator: "or", conditions: [
              { id: "f1", columnId: "currency", operator: "is", value: "USD" },
              { id: "f2", columnId: "bank", operator: "is", value: "HSBC" },
            ] },
          ],
        },
      }),
    )
    // No grouping → rows are the filtered leaves directly.
    // id1 USD/Citi (USD✓), id2 EUR/HSBC (HSBC✓), id3 EUR/HSBC (HSBC✓) → all 3.
    expect(result.current.table.getRowModel().rows).toHaveLength(3)
  })

  it("setFilterState normalizes away unknown-column conditions", () => {
    const { result } = setup()
    act(() =>
      result.current.setFilterState({
        combinator: "and",
        groups: [
          { id: "g1", combinator: "and", conditions: [
            { id: "f1", columnId: "ghost", operator: "is", value: "x" },
          ] },
        ],
      }),
    )
    expect(result.current.filterState.groups).toEqual([])
  })
})

describe("useGroupedTable — pagination clamping", () => {
  it("clamps the page index when grouping collapses the page count (regression: rendered 'No results.' + 'Page 3 of 1')", () => {
    // 120 leaf rows = 3 pages of 50; grouping by entity collapses to 2 top-level rows = 1 page.
    const many: Acct[] = Array.from({ length: 120 }, (_, i) => ({
      id: String(i + 1),
      entity: i % 2 === 0 ? "Coffee Inc" : "Holding BV",
      bank: i % 3 === 0 ? "Citi" : "HSBC",
      currency: "USD",
    }))
    const { result } = renderHook(() =>
      useGroupedTable<Acct>({
        data: many,
        columns,
        groupableDimensions: [
          { id: "entity", label: "Entity" },
          { id: "bank", label: "Bank" },
        ],
        groupColumn: { renderLeaf: (row) => row.original.id },
        enablePagination: true,
      }),
    )
    act(() => result.current.table.setPageIndex(2))
    expect(result.current.table.getState().pagination.pageIndex).toBe(2)

    act(() => result.current.setGrouping(["entity"]))
    // autoResetPageIndex is off (don't bounce the user on data edits), so the
    // clamp effect is what snaps an out-of-range page back to the last real one.
    expect(result.current.table.getState().pagination.pageIndex).toBe(0)
    expect(result.current.table.getRowModel().rows.length).toBeGreaterThan(0)
  })
})
