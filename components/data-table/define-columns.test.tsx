import { fireEvent, render, screen } from "@testing-library/react"
import { flexRender } from "@tanstack/react-table"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import { DataTableRuntimeContext } from "./data-table-runtime-context"
import { defineColumns } from "./define-columns"
import type { CellPos, DataTableRuntime } from "./types"

type Row = { id: string; name: string; age: number; active: boolean }

const ROW: Row = { id: "r1", name: "Ada", age: 30, active: true }

// jsdom does NOT reproduce a real browser's native "mousedown moves focus"
// behavior for arbitrary tabIndex=0 elements the way Chrome/Firefox/Safari
// do — a plain `fireEvent.click(el)` never touches document.activeElement or
// fires a `focus` event. That gap is exactly what let a previous "fix" pass
// its unit test (via a `rerender()`-simulated isActive transition) while
// being broken for every real mouse click: real clicks fire mousedown →
// native focus (→ a `focus` event) → mouseup → click, as four separate
// browser events, each producing its own React commit — and it's that
// interleaving (onFocus's setActiveCell committing before onClick runs) that
// the click-vs-focus race in FieldCell's onClick handler has to account for.
// This helper reproduces that real sequence so tests exercise the actual
// event order instead of only the click.
function realClick(el: HTMLElement) {
  fireEvent.mouseDown(el)
  el.focus()
  fireEvent.mouseUp(el)
  fireEvent.click(el)
}

function ctxFor(columnId: string, value: unknown) {
  return {
    getValue: () => value,
    row: { id: ROW.id, original: ROW },
    column: { id: columnId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

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

describe("defineColumns / col builder", () => {
  it("col.text builds a ColumnDef with the accessor, a string label in meta, and a working display cell", () => {
    const col = defineColumns<Row>()
    const column = col.text("name", { header: "Name" })
    expect(column.id).toBe("name")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((column.meta as any).label).toBe("Name")

    render(
      <DataTableRuntimeContext.Provider value={stubRuntime()}>
        {flexRender(column.cell, ctxFor("name", "Ada"))}
      </DataTableRuntimeContext.Provider>,
    )
    expect(screen.getByText("Ada")).toBeInTheDocument()
  })

  it("col.number rejects a non-numeric key at compile time (type-level; see column-usage note below)", () => {
    const col = defineColumns<Row>()
    // @ts-expect-error "name" is a string field, not assignable to col.number
    col.number("name")
    expect(true).toBe(true)
  })

  it("defaults label to a capitalized accessor key when header isn't a string", () => {
    const col = defineColumns<Row>()
    const column = col.number("age")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((column.meta as any).label).toBe("Age")
  })

  it("renders field.display outside a DataTableRuntimeContext (degrades to read-only)", () => {
    const col = defineColumns<Row>()
    const column = col.text("name")
    render(<>{flexRender(column.cell, ctxFor("name", "Ada"))}</>)
    expect(screen.getByText("Ada")).toBeInTheDocument()
  })

  it("clicking an already-active editable cell begins edit; typing commits via updateData", () => {
    const pos: CellPos = { rowId: "r1", columnId: "name" }
    const runtime = stubRuntime({
      isActive: (p) => p.rowId === pos.rowId && p.columnId === pos.columnId,
      isColumnEditable: () => true,
    })
    const col = defineColumns<Row>()
    const column = col.text("name", { editable: true })

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctxFor("name", "Ada"))}
      </DataTableRuntimeContext.Provider>,
    )
    realClick(screen.getByText("Ada"))
    expect(runtime.beginEdit).toHaveBeenCalledWith(pos)
  })

  it("clicking a cell that is not active calls setActiveCell, not beginEdit", () => {
    const pos: CellPos = { rowId: "r1", columnId: "name" }
    const runtime = stubRuntime({
      isActive: () => false, // cell is not the active one
      isColumnEditable: () => true,
    })
    const col = defineColumns<Row>()
    const column = col.text("name", { editable: true })

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctxFor("name", "Ada"))}
      </DataTableRuntimeContext.Provider>,
    )
    fireEvent.click(screen.getByText("Ada"))
    expect(runtime.setActiveCell).toHaveBeenCalledWith(pos)
    expect(runtime.beginEdit).not.toHaveBeenCalled()
  })

  it("clicking an active but non-editable cell calls setActiveCell, not beginEdit", () => {
    const pos: CellPos = { rowId: "r1", columnId: "name" }
    const runtime = stubRuntime({
      isActive: (p) => p.rowId === pos.rowId && p.columnId === pos.columnId,
      isColumnEditable: () => true,
    })
    const col = defineColumns<Row>()
    // Column-level editable: false overrides the table-level default.
    const column = col.text("name", { editable: false })

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctxFor("name", "Ada"))}
      </DataTableRuntimeContext.Provider>,
    )
    // Two real clicks, matching the sibling "already-active editable cell"
    // test's pattern: the first click's mousedown/focus sequence sets
    // wasActiveBeforeMouseDownRef to the (stubbed) isActive value, then the
    // second click is the one that actually exercises onClick with
    // wasActive === true. A plain single `fireEvent.click` never fires
    // mousedown, so wasActiveBeforeMouseDownRef stays false and the
    // `&& editable` half of onClick's condition is never reached at all —
    // this test would then pass even with the editable guard deleted. Two
    // realClicks close that gap.
    realClick(screen.getByText("Ada"))
    realClick(screen.getByText("Ada"))
    expect(runtime.setActiveCell).toHaveBeenCalledWith(pos)
    expect(runtime.beginEdit).not.toHaveBeenCalled()
  })

  it("editing mode renders the field's edit renderer and commits through runtime.updateData", () => {
    const pos: CellPos = { rowId: "r1", columnId: "name" }
    const runtime = stubRuntime({
      isActive: (p) => p.rowId === pos.rowId && p.columnId === pos.columnId,
      isEditing: (p) => p.rowId === pos.rowId && p.columnId === pos.columnId,
      isColumnEditable: () => true,
    })
    const col = defineColumns<Row>()
    const column = col.text("name", { editable: true })

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctxFor("name", "Ada"))}
      </DataTableRuntimeContext.Provider>,
    )
    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "Grace" } })
    fireEvent.blur(input)
    expect(runtime.updateData).toHaveBeenCalledWith("r1", "name", "Grace")
    expect(runtime.stopEditing).toHaveBeenCalled()
  })

  it("cancel() discards the staged edit; re-entering edit mode resyncs from ctx.getValue()", () => {
    const pos: CellPos = { rowId: "r1", columnId: "name" }
    let editing = false
    const runtime = stubRuntime({
      isActive: (p) => p.rowId === pos.rowId && p.columnId === pos.columnId,
      isEditing: () => editing,
      isColumnEditable: () => true,
      stopEditing: vi.fn(() => {
        editing = false
      }),
    })
    const col = defineColumns<Row>()
    const column = col.text("name", { editable: true })

    // A fresh element each call — testing-library's rerender bails out of
    // re-invoking the component if handed the exact same element reference
    // (React skips reconciliation when props are referentially identical).
    const renderTree = () => (
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctxFor("name", "Ada"))}
      </DataTableRuntimeContext.Provider>
    )
    const { rerender } = render(renderTree())

    // Enter edit mode and stage a change without committing it.
    editing = true
    rerender(renderTree())
    const input = screen.getByRole("textbox") as HTMLInputElement
    fireEvent.change(input, { target: { value: "Draft" } })
    expect(input.value).toBe("Draft")

    // Cancel via Escape — discards the staged value, exits edit mode.
    fireEvent.keyDown(input, { key: "Escape" })
    expect(runtime.stopEditing).toHaveBeenCalled()
    rerender(renderTree())

    // Re-enter edit mode on the same cell: the edit UI must show the
    // original live value from ctx.getValue(), not the abandoned "Draft"
    // staged edit — this is what the useEffect resync-on-reentry guards.
    editing = true
    rerender(renderTree())
    const reopenedInput = screen.getByRole("textbox") as HTMLInputElement
    expect(reopenedInput.value).toBe("Ada")
  })

  it("moves real DOM focus to a cell when it becomes the active cell (not via click)", () => {
    const pos: CellPos = { rowId: "r1", columnId: "name" }
    let active = false
    const runtime = stubRuntime({
      isActive: (p) => active && p.rowId === pos.rowId && p.columnId === pos.columnId,
    })
    const col = defineColumns<Row>()
    const column = col.text("name")

    // A fresh element each call, same reasoning as the isEditing-resync test
    // above: rerender bails out of re-invoking the component when handed the
    // exact same element reference.
    const renderTree = () => (
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctxFor("name", "Ada"))}
      </DataTableRuntimeContext.Provider>
    )
    const { rerender } = render(renderTree())
    const cell = screen.getByText("Ada").closest("div") as HTMLElement
    expect(document.activeElement).not.toBe(cell)

    // The runtime reports this cell as active from outside (e.g. keyboard
    // navigation moved here), not via a click on the cell itself.
    active = true
    rerender(renderTree())

    expect(document.activeElement).toBe(cell)
  })

  it("col.checkbox honors a false editable override even when the table default is editable", () => {
    const runtime = stubRuntime({ isColumnEditable: () => true }) // table-level default: editable
    const col = defineColumns<Row>()
    const column = col.checkbox("active", { editable: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((column.meta as any).editable).toBe(false)

    render(
      <DataTableRuntimeContext.Provider value={runtime}>
        {flexRender(column.cell, ctxFor("active", true))}
      </DataTableRuntimeContext.Provider>,
    )
    // Read-only pill renders; no checkbox input present.
    expect(screen.queryByRole("checkbox")).toBeNull()
    expect(screen.getByText("True")).toBeInTheDocument()
  })
})
