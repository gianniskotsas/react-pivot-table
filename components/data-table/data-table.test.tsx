import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DataTable } from "./data-table"
import { defineColumns } from "./define-columns"

type Row = { id: string; name: string; age: number }

const DATA: Row[] = [
  { id: "1", name: "Bailey", age: 44 },
  { id: "2", name: "Ada", age: 30 },
]

function columns() {
  const col = defineColumns<Row>()
  return [col.text("name", { header: "Name" }), col.number("age", { header: "Age" })]
}

describe("DataTable", () => {
  it("renders headers and rows", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Bailey")).toBeInTheDocument()
    expect(screen.getByText("Ada")).toBeInTheDocument()
  })

  it("shows a 'No results' row when data is empty", () => {
    render(<DataTable data={[]} columns={columns()} getRowId={(r) => r.id} />)
    expect(screen.getByText("No results.")).toBeInTheDocument()
  })

  it("clicking a cell then clicking again enters edit mode when editable, and commits via onUpdateData", () => {
    const onUpdateData = vi.fn()
    render(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        editable
        onUpdateData={onUpdateData}
      />,
    )
    const cell = screen.getByText("Bailey")
    fireEvent.click(cell) // first click: activate
    fireEvent.click(screen.getByText("Bailey")) // second click on active cell: edit
    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "Grace" } })
    fireEvent.blur(input)
    expect(onUpdateData).toHaveBeenCalledWith("1", "name", "Grace")
  })

  it("renders the Columns menu toolbar button", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    expect(screen.getByRole("button", { name: /columns/i })).toBeInTheDocument()
  })

  it("pagination controls are shown by default and can be disabled", () => {
    const { rerender } = render(
      <DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />,
    )
    expect(screen.getByRole("navigation", { name: "Table pagination" })).toBeInTheDocument()
    rerender(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        enablePagination={false}
      />,
    )
    expect(screen.queryByRole("navigation", { name: "Table pagination" })).toBeNull()
  })
})
