import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ColumnsMenuContent } from "./columns-menu"

function mockColumn({
  id,
  label,
  visible = true,
  pinned = false as false | "left" | "right",
  canHide = true,
  canPin = true,
}: {
  id: string
  label: string
  visible?: boolean
  pinned?: false | "left" | "right"
  canHide?: boolean
  canPin?: boolean
}) {
  return {
    id,
    columnDef: { meta: { label } },
    getCanHide: () => canHide,
    getCanPin: () => canPin,
    getIsVisible: () => visible,
    toggleVisibility: vi.fn(),
    getIsPinned: () => pinned,
    pin: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe("ColumnsMenuContent", () => {
  it("lists each hideable/pinnable column by its meta label", () => {
    const columns = [mockColumn({ id: "name", label: "Name" }), mockColumn({ id: "age", label: "Age" })]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = { getAllLeafColumns: () => columns } as any
    render(<ColumnsMenuContent table={table} />)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Age")).toBeInTheDocument()
  })

  it("toggling the checkbox calls column.toggleVisibility", () => {
    const column = mockColumn({ id: "name", label: "Name", visible: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = { getAllLeafColumns: () => [column] } as any
    render(<ColumnsMenuContent table={table} />)
    fireEvent.click(screen.getByRole("checkbox"))
    expect(column.toggleVisibility).toHaveBeenCalledWith(false)
  })

  it("clicking pin-left calls column.pin('left'); clicking again unpins", () => {
    const column = mockColumn({ id: "name", label: "Name" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = { getAllLeafColumns: () => [column] } as any
    const { rerender } = render(<ColumnsMenuContent table={table} />)
    fireEvent.click(screen.getByLabelText("Pin Name left"))
    expect(column.pin).toHaveBeenCalledWith("left")

    // Simulate the table applying the pin (the real column.pin mutates
    // table state; this mock is static, so re-render with getIsPinned
    // reflecting the new state before the second click).
    column.getIsPinned = () => "left"
    rerender(<ColumnsMenuContent table={table} />)
    fireEvent.click(screen.getByLabelText("Pin Name left"))
    expect(column.pin).toHaveBeenCalledWith(false)
  })

  it("a column with getCanHide/getCanPin both false renders without a checkbox or pin buttons", () => {
    const column = mockColumn({ id: "name", label: "Name", canHide: false, canPin: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = { getAllLeafColumns: () => [column] } as any
    render(<ColumnsMenuContent table={table} />)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.queryByRole("checkbox")).toBeNull()
  })
})
