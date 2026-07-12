import { act, renderHook } from "@testing-library/react"
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import * as React from "react"
import { describe, expect, it } from "vitest"

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
