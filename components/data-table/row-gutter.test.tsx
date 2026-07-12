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
    toggleRowSelected: vi.fn(),
    ...overrides,
  }
}

function mockTable({
  allPageSelected = false,
  allRowsSelected = false,
  somePageSelected = false,
  someRowsSelected = false,
  filteredCount = 3,
  // The row model a body cell's `row` sits in — index 0 by default matches
  // most tests' single-row setup. Tests exercising `rowNumber` at a
  // specific display position pass a longer array with the row placed at
  // the intended index (see "displayIndex" below): row-gutter.tsx derives
  // the displayed row number from the row's position in THIS array, not
  // from TanStack's own `row.index` (which is fixed to the row's position
  // in the original, unsorted data and would be wrong once sorted).
  rows = [] as unknown[],
} = {}) {
  return {
    getIsAllPageRowsSelected: () => allPageSelected,
    getIsAllRowsSelected: () => allRowsSelected,
    getIsSomePageRowsSelected: () => somePageSelected,
    getIsSomeRowsSelected: () => someRowsSelected,
    toggleAllRowsSelected: vi.fn(),
    toggleAllPageRowsSelected: vi.fn(),
    getFilteredRowModel: () => ({ flatRows: Array.from({ length: filteredCount }) }),
    getRowModel: () => ({ rows }),
    getState: () => ({ pagination: { pageIndex: 0, pageSize: 10 } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

function mockRow({ id = "r0", index = 0, selected = false } = {}) {
  return {
    id,
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

  it("body cell always renders both the row number and a checkbox, revealed via CSS row-hover/focus rather than JS state", () => {
    // Both elements are always mounted (never conditionally rendered) so
    // there's no JS mouseenter/mouseleave state that can get stuck — see
    // RowGutterCell's comment for why. The number is hidden (and the
    // checkbox shown) purely via the `[tr:hover_&]`/`group-focus-within`
    // classes below, which only take effect under real CSS (not jsdom), so
    // this test asserts the class wiring rather than computed visibility.
    const column = buildRowGutterColumn<{ id: string }>()
    // `row.index` is deliberately NOT 2 here — row-gutter.tsx must derive the
    // displayed number from the row's position in `table.getRowModel().rows`
    // (its actual on-screen order), not from TanStack's `row.index` (fixed
    // to the row's position in the original, unsorted data). Placing the row
    // at position 2 of `rows` while giving it a mismatched `row.index` of 99
    // means this test would fail if that regressed back to using `row.index`.
    // The entry placed in `rows` is a COPY of `row` (matching `id`, different
    // object), not the same reference: real TanStack row objects returned by
    // `table.getRowModel()` are never the exact same instance as the `row` a
    // cell receives via CellContext (getSortedRowModel rebuilds fresh `{...row}`
    // copies), so this would also fail if the lookup regressed to reference
    // -based `indexOf` instead of an id-based `findIndex`.
    const row = mockRow({ id: "r2", index: 99, selected: false })
    const table = mockTable({ rows: [{}, {}, { ...row }] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table, row, column } as any

    render(<>{flexRender(column.cell, ctx)}</>)
    const numberSpan = screen.getByText("3")
    expect(numberSpan.className).toContain("[tr:hover_&]:hidden")
    expect(numberSpan.className).toContain("group-focus-within:hidden")

    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toBeInTheDocument()
    const checkboxWrapper = checkbox.parentElement!
    expect(checkboxWrapper.className).toContain("hidden")
    expect(checkboxWrapper.className).toContain("[tr:hover_&]:inline-flex")
    expect(checkboxWrapper.className).toContain("group-focus-within:inline-flex")
  })

  it("body cell always shows the checkbox (not the number) when the row is already selected, regardless of hover/focus", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const row = mockRow({ id: "r0", index: 0, selected: true })
    const table = mockTable({ rows: [{ ...row }] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table, row, column } as any
    const toggleRowSelected = vi.fn()
    const runtime = stubRuntime({ toggleRowSelected })

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctx)}
      </DataTableRuntimeContext.Provider>,
    )
    const numberSpan = screen.getByText("1")
    expect(numberSpan.className).toContain("hidden")

    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toBeInTheDocument()
    expect(checkbox.parentElement!.className).toBe("inline-flex")

    fireEvent.click(checkbox)
    expect(toggleRowSelected).toHaveBeenCalledWith("r0", false, false)
  })

  it("body cell checkbox click routes the row id and shift-key state through to toggleRowSelected (not row.index, which can be wrong once sorted — see displayIndex test above)", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const row = mockRow({ id: "r4", index: 99, selected: false })
    const table = mockTable({ rows: [{}, {}, {}, {}, { ...row }] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table, row, column } as any
    const toggleRowSelected = vi.fn()
    const runtime = stubRuntime({ toggleRowSelected })

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctx)}
      </DataTableRuntimeContext.Provider>,
    )
    // shiftKey is captured on pointerdown (see RowGutterCell's comment: base-ui's
    // onCheckedChange carries the native event, but Radix's doesn't at all — a
    // shared pointerdown/keydown listener that works identically on both builds
    // is used instead), so a real interaction fires pointerdown before click.
    const checkbox = screen.getByRole("checkbox")
    fireEvent.pointerDown(checkbox, { shiftKey: true })
    fireEvent.click(checkbox)
    expect(toggleRowSelected).toHaveBeenCalledWith("r4", true, true)
  })

  it("body cell checkbox click without a held shift key routes shiftKey=false through to toggleRowSelected", () => {
    const column = buildRowGutterColumn<{ id: string }>()
    const row = mockRow({ id: "r1", index: 1, selected: false })
    const table = mockTable({ rows: [{}, { ...row }] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = { table, row, column } as any
    const toggleRowSelected = vi.fn()
    const runtime = stubRuntime({ toggleRowSelected })

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctx)}
      </DataTableRuntimeContext.Provider>,
    )
    const checkbox = screen.getByRole("checkbox")
    fireEvent.pointerDown(checkbox)
    fireEvent.click(checkbox)
    expect(toggleRowSelected).toHaveBeenCalledWith("r1", true, false)
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
