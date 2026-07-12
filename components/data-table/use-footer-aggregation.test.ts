import { act, renderHook } from "@testing-library/react"
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import { useFooterAggregation } from "./use-footer-aggregation"

type Row = { id: string; name: string; amount: number }

const DATA: Row[] = [
  { id: "1", name: "a", amount: 10 },
  { id: "2", name: "b", amount: 20 },
  { id: "3", name: "c", amount: 30 },
]

function useTestTable(data: Row[] = DATA) {
  const [rowSelection, setRowSelection] = React.useState({})
  return useReactTable<Row>({
    data,
    columns: [
      { id: "name", accessorKey: "name" },
      { id: "amount", accessorKey: "amount" },
    ],
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
  })
}

describe("useFooterAggregation — scope + client aggregation", () => {
  it("defaults each calculable column's method from calculableColumns[].default", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
      })
    })
    expect(result.current.methods.amount).toBe("sum")
  })

  it("stateFor returns undefined for a non-calculable column, or a calculable column with no method set", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount" }],
        isAllMatchingSelected: false,
      })
    })
    expect(result.current.stateFor("name")).toBeUndefined()
    expect(result.current.stateFor("amount")).toBeUndefined()
  })

  it("computes the aggregate over all visible rows when nothing is selected", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
      })
    })
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 60 })
    expect(result.current.scopeIsSelection).toBe(false)
  })

  it("switches scope to the selection once rows are selected", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      React.useEffect(() => {
        table.getRow("1").toggleSelected(true)
        table.getRow("2").toggleSelected(true)
      }, [table])
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
      })
    })
    expect(result.current.scopeIsSelection).toBe(true)
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 30 })
  })

  it("setMethod updates the live method for a column", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount" }],
        isAllMatchingSelected: false,
      })
    })
    act(() => result.current.setMethod("amount", "avg"))
    expect(result.current.methods.amount).toBe("avg")
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 20 })
    act(() => result.current.setMethod("amount", null))
    expect(result.current.stateFor("amount")).toBeUndefined()
  })
})

describe("useFooterAggregation — hybrid client/server", () => {
  it("computes client-side when manualPagination is on but totalRowCount matches loaded rows", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: DATA.length,
      })
    })
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 60 })
  })

  it("shows an idle 'Calculate' state when the scope exceeds loaded rows and computeAggregate is provided", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: 1000,
        computeAggregate: async () => 999,
      })
    })
    expect(result.current.stateFor("amount")).toEqual({ status: "idle" })
  })

  it("calculate() runs computeAggregate with the right args and resolves to a value", async () => {
    const computeAggregate = vi.fn().mockResolvedValue(999)
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: 1000,
        computeAggregate,
      })
    })
    await act(async () => result.current.calculate("amount"))
    expect(computeAggregate).toHaveBeenCalledWith({
      columnId: "amount",
      method: "sum",
      scope: "all-matching",
    })
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 999 })
  })

  it("calculate() surfaces a rejected computeAggregate as an error state", async () => {
    const computeAggregate = vi.fn().mockRejectedValue(new Error("boom"))
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: 1000,
        computeAggregate,
      })
    })
    await act(async () => result.current.calculate("amount"))
    expect(result.current.stateFor("amount")).toEqual({ status: "error", message: "boom" })
  })

  it("a resolved value goes stale when the method changes, and calculate() clears it back to a fresh value", async () => {
    const computeAggregate = vi.fn().mockResolvedValue(999)
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: 1000,
        computeAggregate,
      })
    })
    await act(async () => result.current.calculate("amount"))
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 999 })

    act(() => result.current.setMethod("amount", "avg"))
    expect(result.current.stateFor("amount")).toEqual({ status: "stale", value: 999 })

    computeAggregate.mockResolvedValue(42)
    await act(async () => result.current.calculate("amount"))
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 42 })
  })

  it("calculate() ignores a stale in-flight response when a newer request supersedes it", async () => {
    let resolveFirst!: (value: number) => void
    let resolveSecond!: (value: number) => void
    const computeAggregate = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<number>((res) => {
            resolveFirst = res
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<number>((res) => {
            resolveSecond = res
          }),
      )

    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: 1000,
        computeAggregate,
      })
    })

    act(() => result.current.calculate("amount")) // first request in flight
    act(() => result.current.calculate("amount")) // second request supersedes it

    // Resolve the SECOND (newer) request first, then the FIRST (stale) one —
    // out of arrival order, simulating a slow first response.
    await act(async () => resolveSecond(42))
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 42 })

    await act(async () => resolveFirst(999))
    // The stale first response must NOT overwrite the newer, already-applied
    // result — it should still show 42, not silently flip to 999.
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 42 })
  })

  it("gracefully falls back to loaded-rows-only, marked partial, when the scope exceeds loaded and no computeAggregate is provided", () => {
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: 1000,
      })
    })
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: 60, partial: true })
  })
})
