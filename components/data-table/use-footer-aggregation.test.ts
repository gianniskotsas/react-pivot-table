import { act, renderHook } from "@testing-library/react"
import {
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
  type ExpandedState,
} from "@tanstack/react-table"
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

type GroupableRow = { id: string; category: string; amount: number }

// "category" is deliberately NOT unique per row — group "x" holds TWO leaves
// (rows 1 and 2) and group "y" holds one (row 3). Grouping by something
// unique per row (e.g. "name" in DATA above) would make every group a
// single-leaf group, which can't actually exercise double-counting: a
// single-leaf group's rolled-up value and its one leaf's value are the same
// number, so a bug that adds the group row's value on top of its own leaf
// would still coincidentally look "sum-shaped" for that group in isolation
// (2x a single value looks like it could just be a different, plausible
// total) — a multi-leaf group makes the doubled total unambiguous.
const GROUPED_DATA: GroupableRow[] = [
  { id: "1", category: "x", amount: 10 },
  { id: "2", category: "x", amount: 20 },
  { id: "3", category: "y", amount: 30 },
]

// Groups by "category" — per Task 6, TanStack's pipeline puts grouping
// BEFORE sorting, so the group rows and their leaves both surface at top
// level of the sorted model once expanded. `selectAll` defaults to true (the
// "everything selected" scenario the double-counting test below exercises);
// pass false to exercise the default, nothing-selected scope instead.
function useTestTableWithGrouping(data: GroupableRow[] = GROUPED_DATA, selectAll = true) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [grouping, setGrouping] = React.useState<string[]>(["category"])
  const [expanded, setExpanded] = React.useState<ExpandedState>(true)
  const table = useReactTable<GroupableRow>({
    data,
    columns: [
      { id: "category", accessorKey: "category", enableGrouping: true },
      { id: "amount", accessorKey: "amount" },
    ],
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    state: { rowSelection, grouping, expanded },
    onRowSelectionChange: setRowSelection,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    enableRowSelection: true,
    enableSubRowSelection: true,
    paginateExpandedRows: false,
  })

  React.useEffect(() => {
    if (selectAll) table.toggleAllRowsSelected(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return table
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

describe("useFooterAggregation — in-flight invalidation", () => {
  it("drops an in-flight response when the method changes mid-flight (a slow sum can never land labeled as avg)", async () => {
    let resolveFirst!: (value: number) => void
    const computeAggregate = vi.fn().mockImplementationOnce(
      () =>
        new Promise<number>((res) => {
          resolveFirst = res
        }),
    )
    const { result } = renderHook(() => {
      const table = useTestTable()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", methods: ["sum", "avg"], default: "sum" }],
        isAllMatchingSelected: false,
        manualPagination: true,
        totalRowCount: 1000,
        computeAggregate,
      })
    })

    act(() => result.current.calculate("amount")) // "sum" request in flight
    expect(result.current.stateFor("amount")).toEqual({ status: "loading" })

    // Switch method while the request is still pending: the pending result is
    // now for the wrong method, so the column resets to its Calculate trigger…
    act(() => result.current.setMethod("amount", "avg"))
    expect(result.current.stateFor("amount")).toEqual({ status: "idle" })

    // …and when the stale "sum" response finally arrives, it must be dropped —
    // NOT committed as a fresh value under the "avg" label.
    await act(async () => resolveFirst(999))
    expect(result.current.stateFor("amount")).toEqual({ status: "idle" })
  })
})

describe("useFooterAggregation — grouping", () => {
  // Empirically measured (see task-8-report.md): with nothing selected, the
  // unfixed hook's `scopeRows` was `table.getSortedRowModel().rows` — the
  // TOP-LEVEL row array, which under grouping holds only the 2 GROUP rows
  // ("x", "y"), never flattened down to the 3 real leaves. Aggregating "sum"
  // over just [group-x.getValue()=30, group-y.getValue()=30] happens to still
  // equal the true leaf sum (60) — sum is distributive over a partition, so
  // that method can't tell group-level rows from leaf-level ones. "avg" has
  // no such coincidence: avg([30, 30]) = 30, but the true leaf average is
  // (10+20+30)/3 = 20 — an unambiguous, non-coincidental mismatch that proves
  // the scope was resolving to group rows instead of their leaves.
  it("aggregates over the underlying leaf rows, not the group rows sitting beside them", () => {
    const { result } = renderHook(() => {
      const table = useTestTableWithGrouping(GROUPED_DATA, false)
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "avg" }],
        isAllMatchingSelected: false,
      })
    })
    const leafAvg =
      GROUPED_DATA.reduce((n, r) => n + r.amount, 0) / GROUPED_DATA.length
    expect(leafAvg).toBe(20)
    expect(result.current.scopeIsSelection).toBe(false)
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: leafAvg })
  })

  it("excludes group rows from a grouped selection so it is not double-counted", () => {
    // Selecting every row (leaves AND groups, via toggleAllRowsSelected)
    // switches scope to the selection. Assert the total leaf sum here too so
    // a regression that starts flattening `getSelectedRowModel()` incorrectly
    // (re-including group rows) would be caught: group "x"'s rolled-up value
    // (30) sitting beside its own two leaves (10, 20) would double it.
    const { result } = renderHook(() => {
      const table = useTestTableWithGrouping()
      return useFooterAggregation({
        table,
        calculableColumns: [{ columnId: "amount", default: "sum" }],
        isAllMatchingSelected: false,
      })
    })
    const leafSum = GROUPED_DATA.reduce((n, r) => n + r.amount, 0)
    expect(leafSum).toBe(60)
    expect(result.current.scopeIsSelection).toBe(true)
    expect(result.current.stateFor("amount")).toEqual({ status: "value", value: leafSum })
  })
})
