import { fireEvent, render, screen } from "@testing-library/react"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { describe, expect, it, vi } from "vitest"

import { DataTableFooter } from "./footer-aggregation"
import type { FooterAggregationResult } from "./use-footer-aggregation"

type Row = { id: string; name: string; amount: number }

const DATA: Row[] = [{ id: "1", name: "a", amount: 10 }]

function useTestTable() {
  return useReactTable<Row>({
    data: DATA,
    columns: [
      { id: "name", accessorKey: "name", meta: { label: "Name" } },
      { id: "amount", accessorKey: "amount", meta: { label: "Amount" } },
    ],
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  })
}

function stubAggregation(overrides: Partial<FooterAggregationResult> = {}): FooterAggregationResult {
  return {
    methods: { amount: "sum" },
    setMethod: vi.fn(),
    stateFor: (columnId) =>
      columnId === "amount" ? { status: "value", value: 10 } : undefined,
    scopeIsSelection: false,
    calculate: vi.fn(),
    ...overrides,
  }
}

function Harness({ aggregation }: { aggregation: FooterAggregationResult }) {
  const table = useTestTable()
  return <table><DataTableFooter table={table} aggregation={aggregation} /></table>
}

describe("DataTableFooter", () => {
  it("renders nothing when there are no calculable columns", () => {
    const { container } = render(<Harness aggregation={stubAggregation({ methods: {} })} />)
    expect(container.querySelector("tfoot")).toBeNull()
  })

  it("shows the picked method's value for a calculable column, and an empty cell for a non-calculable one", () => {
    render(<Harness aggregation={stubAggregation()} />)
    expect(screen.getByText("Sum")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
  })

  it("shows a Calculate trigger for an idle server state, and calls calculate() on click", () => {
    const calculate = vi.fn()
    render(
      <Harness
        aggregation={stubAggregation({
          stateFor: (columnId) => (columnId === "amount" ? { status: "idle" } : undefined),
          calculate,
        })}
      />,
    )
    fireEvent.click(screen.getByText("Calculate"))
    expect(calculate).toHaveBeenCalledWith("amount")
  })

  it("shows a partial-value qualifier when the graceful client-only fallback is active", () => {
    render(
      <Harness
        aggregation={stubAggregation({
          stateFor: (columnId) =>
            columnId === "amount" ? { status: "value", value: 10, partial: true } : undefined,
        })}
      />,
    )
    expect(screen.getByText("(loaded rows)")).toBeInTheDocument()
  })

  it("opens the method picker and calls setMethod on a choice", () => {
    const setMethod = vi.fn()
    render(<Harness aggregation={stubAggregation({ setMethod })} />)
    fireEvent.click(screen.getByText("Sum"))
    fireEvent.click(screen.getByText("Average"))
    expect(setMethod).toHaveBeenCalledWith("amount", "avg")
  })

  it("gives each column's method-picker trigger a distinct, column-labeled accessible name", () => {
    render(
      <Harness
        aggregation={stubAggregation({
          methods: { name: "count", amount: "sum" },
          stateFor: (columnId) =>
            columnId === "amount" ? { status: "value", value: 10 } : { status: "value", value: 1 },
        })}
      />,
    )
    expect(
      screen.getByRole("button", { name: "Name aggregation: Count" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Amount aggregation: Sum" }),
    ).toBeInTheDocument()
  })
})
