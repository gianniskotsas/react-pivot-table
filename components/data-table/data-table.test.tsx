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

// A real click fires mousedown → native focus (→ a `focus` event) → mouseup
// → click as four separate browser events. jsdom does not move focus (or
// fire a `focus` event) on a plain `fireEvent.click`, so tests that only
// call `fireEvent.click` can't catch bugs caused by that real event
// interleaving — e.g. a "click to activate, click again to edit" cell
// jumping straight to edit on the very first click because the focus event
// (which fires before click) already flipped isActive to true. Use this
// helper wherever a test needs to faithfully exercise a real click.
function realClick(el: HTMLElement) {
  fireEvent.mouseDown(el)
  el.focus()
  fireEvent.mouseUp(el)
  fireEvent.click(el)
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
    realClick(cell) // first real click: activate only
    // A single real click must NOT jump straight to edit mode. This guards
    // against a regression where onFocus (fired by the browser on mousedown,
    // before click) sets isActive=true in time for onClick's own
    // isActive-check to see it, collapsing "click to activate, click again
    // to edit" into a single click.
    expect(screen.queryByRole("textbox")).toBeNull()
    realClick(screen.getByText("Bailey")) // second real click on active cell: edit
    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "Grace" } })
    fireEvent.blur(input)
    expect(onUpdateData).toHaveBeenCalledWith("1", "name", "Grace")
  })

  it("real DOM focus returns to the cell (not document.body) after leaving edit mode, so Enter re-opens it", () => {
    render(
      <DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} editable />,
    )
    const cell = screen.getByText("Bailey")
    realClick(cell) // activate
    realClick(screen.getByText("Bailey")) // edit
    const input = screen.getByRole("textbox")
    fireEvent.keyDown(input, { key: "Escape" }) // cancel edit, stays active

    // The cell (not <body>) must hold real DOM focus here. Regression guard:
    // FieldCell's focus-restoration effect used to depend on [isActive]
    // only; since beginEdit/stopEditing never touch activeCell, isActive
    // never changes across an edit→escape cycle, so the effect wouldn't
    // rerun when the cell's <div> remounted after the editor unmounted —
    // leaving focus stranded on <body>, where the table wrapper's
    // onKeyDown can never see it (body is an ancestor of the wrapper, not a
    // descendant), so Enter would silently do nothing.
    const reactivatedCell = screen.getByText("Bailey").closest("div") as HTMLElement
    expect(document.activeElement).toBe(reactivatedCell)

    fireEvent.keyDown(reactivatedCell, { key: "Enter" })
    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("renders the Columns menu toolbar button", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    expect(screen.getByRole("button", { name: /columns/i })).toBeInTheDocument()
  })

  it("a pinned cell gets a hover-aware background class instead of a flat inline background", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)

    fireEvent.click(screen.getByRole("button", { name: /columns/i }))
    fireEvent.click(screen.getByRole("button", { name: "Pin Name left" }))

    const cell = screen.getByText("Bailey").closest("td") as HTMLTableCellElement
    // The plain `background` that used to always beat TableRow's
    // `hover:bg-muted/50` class now lives in Tailwind classes instead, as
    // arbitrary-variant ancestor selectors targeting a hovered/selected
    // ancestor <tr> directly — no `group` marker class needed on TableRow,
    // so a pinned cell still tracks the row's hover/selected state without
    // requiring registry consumers to have a modified components/ui/table.tsx.
    expect(cell.className).toContain("[tr:hover_&]:bg-muted/50")
    expect(cell.className).toContain("[tr[data-state=selected]_&]:bg-muted")
    expect(cell.style.background).toBe("")
    expect(cell.style.position).toBe("sticky")
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
