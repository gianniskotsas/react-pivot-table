import { fireEvent, render, screen } from "@testing-library/react"
import { flexRender } from "@tanstack/react-table"
import { describe, expect, it, vi } from "vitest"

import { DataTableRuntimeContext } from "./data-table-runtime-context"
import { ROW_GUTTER_COLUMN_ID, buildRowGutterColumn } from "./row-gutter"
import type { DataTableRuntime } from "./types"

function stubRuntime(overrides: Partial<DataTableRuntime> = {}): DataTableRuntime {
  return {
    activeCell: null,
    editingCell: null,
    isActive: () => false,
    isEditing: () => false,
    setActiveCell: vi.fn(),
    beginEdit: vi.fn(),
    stopEditing: vi.fn(),
    moveActive: vi.fn(),
    isColumnEditable: () => false,
    updateData: vi.fn(),
    handleKeyDown: vi.fn(),
    manualPagination: false,
    totalRowCount: undefined,
    isAllMatchingSelected: false,
    setAllMatchingSelected: vi.fn(),
    ...overrides,
  }
}

function mockTable({
  allPageSelected = false,
  allRowsSelected = false,
  somePageSelected = false,
  someRowsSelected = false,
  filteredCount = 3,
} = {}) {
  return {
    getIsAllPageRowsSelected: () => allPageSelected,
    getIsAllRowsSelected: () => allRowsSelected,
    getIsSomePageRowsSelected: () => somePageSelected,
    getIsSomeRowsSelected: () => someRowsSelected,
    toggleAllRowsSelected: vi.fn(),
    toggleAllPageRowsSelected: vi.fn(),
    getFilteredRowModel: () => ({ flatRows: Array.from({ length: filteredCount }) }),
    getState: () => ({ pagination: { pageIndex: 0, pageSize: 10 } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

function mockRow({ index = 0, selected = false } = {}) {
  return {
    index,
    getIsSelected: () => selected,
    toggleSelected: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe("buildRowGutterColumn", () => {
  it("has the expected id and structural column flags", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    expect(column.id).toBe(ROW_GUTTER_COLUMN_ID)
    expect(column.enableSorting).toBe(false)
    expect(column.enableHiding).toBe(false)
    expect(column.enablePinning).toBe(false)
    expect(column.enableResizing).toBe(false)
  })

  it("body cell shows the row number by default, and a checkbox on hover", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const table = mockTable()
    const row = mockRow({ index: 2 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table, row, column } as any

    render(<>{flexRender(column.cell, ctx)}</>)
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.queryByRole("checkbox")).toBeNull()

    fireEvent.mouseEnter(screen.getByText("3").parentElement!)
    expect(screen.getByRole("checkbox")).toBeInTheDocument()
  })

  it("body cell shows a checkbox (not the number) when the row is already selected", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const table = mockTable()
    const row = mockRow({ index: 0, selected: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table, row, column } as any

    render(<>{flexRender(column.cell, ctx)}</>)
    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toBeInTheDocument()
    fireEvent.click(checkbox)
    expect(row.toggleSelected).toHaveBeenCalledWith(false)
  })

  it("header click cycles none -> page -> all-loaded when there's nothing beyond what's loaded", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const table = mockTable({ filteredCount: 3 })
    const runtime = stubRuntime()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table } as any

    const { rerender } = render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.header, ctx)}
      </DataTableRuntimeContext.Provider>,
    )
    fireEvent.click(screen.getByRole("checkbox"))
    expect(table.toggleAllPageRowsSelected).toHaveBeenCalledWith(true)

    // Simulate the table reporting the page is now fully selected.
    const tableAfterPage = mockTable({ allPageSelected: true, somePageSelected: true, someRowsSelected: true })
    rerender(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.header, { table: tableAfterPage } as never)}
      </DataTableRuntimeContext.Provider>,
    )
    fireEvent.click(screen.getByRole("checkbox"))
    expect(tableAfterPage.toggleAllRowsSelected).toHaveBeenCalledWith(true)
  })

  it("header click advances to all-matching when more rows exist beyond what's loaded, then clears", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const table = mockTable({ allRowsSelected: true, allPageSelected: true, someRowsSelected: true, filteredCount: 3 })
    const setAllMatchingSelected = vi.fn()
    const runtime = stubRuntime({
      manualPagination: true,
      totalRowCount: 100,
      setAllMatchingSelected,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table } as any

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.header, ctx)}
      </DataTableRuntimeContext.Provider>,
    )
    fireEvent.click(screen.getByRole("checkbox"))
    expect(setAllMatchingSelected).toHaveBeenCalledWith(true)
  })

  it("header renders aria-checked=mixed and an aria-label describing partial selection when some (but not all) rows are selected", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const table = mockTable({ somePageSelected: true, someRowsSelected: true })
    const runtime = stubRuntime()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table } as any

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.header, ctx)}
      </DataTableRuntimeContext.Provider>,
    )
    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toHaveAttribute("aria-checked", "mixed")
    expect(checkbox).toHaveAttribute("aria-label", "Some rows selected — select all")
  })

  it("header click clears everything from the all-matching state", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const table = mockTable({ allRowsSelected: true })
    const setAllMatchingSelected = vi.fn()
    const runtime = stubRuntime({
      manualPagination: true,
      totalRowCount: 100,
      isAllMatchingSelected: true,
      setAllMatchingSelected,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table } as any

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.header, ctx)}
      </DataTableRuntimeContext.Provider>,
    )
    fireEvent.click(screen.getByRole("checkbox"))
    expect(setAllMatchingSelected).toHaveBeenCalledWith(false)
    expect(table.toggleAllRowsSelected).toHaveBeenCalledWith(false)
  })
})
