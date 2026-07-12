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

  it("a column with getCanHide/getCanPin both false is omitted entirely — nothing this menu offers applies to it", () => {
    // e.g. row-gutter.tsx's structural selection/row-number column sets both
    // to false; every control in this menu is conditional on one of the two,
    // so listing such a column would just show its raw internal id with no
    // way to act on it.
    const column = mockColumn({ id: "__row-gutter__", label: "__row-gutter__", canHide: false, canPin: false })
    const other = mockColumn({ id: "name", label: "Name" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = { getAllLeafColumns: () => [column, other] } as any
    render(<ColumnsMenuContent table={table} />)
    expect(screen.queryByText("__row-gutter__")).toBeNull()
    expect(screen.getByText("Name")).toBeInTheDocument()
  })

  it("a column that can be pinned but not hidden (or vice versa) is still listed", () => {
    const pinOnly = mockColumn({ id: "pinOnly", label: "Pin Only", canHide: false, canPin: true })
    const hideOnly = mockColumn({ id: "hideOnly", label: "Hide Only", canHide: true, canPin: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = { getAllLeafColumns: () => [pinOnly, hideOnly] } as any
    render(<ColumnsMenuContent table={table} />)
    expect(screen.getByText("Pin Only")).toBeInTheDocument()
    expect(screen.getByText("Hide Only")).toBeInTheDocument()
  })
})
