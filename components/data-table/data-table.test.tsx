import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}))

import { toast } from "sonner"

import { DataTable } from "./data-table"
import { defineColumns } from "./define-columns"
import * as ExportCsvModule from "./export-csv"

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
    // The hover tint is an OPAQUE color-mix (not TableRow's translucent
    // bg-muted/50) so scrolled-away columns can't bleed through the sticky
    // pinned cell on hover.
    expect(cell.className).toContain(
      "[tr:hover_&]:bg-[color-mix(in_srgb,var(--muted)_50%,var(--background))]",
    )
    expect(cell.className).toContain("[tr[data-state=selected]_&]:bg-muted")
    expect(cell.style.background).toBe("")
    expect(cell.style.position).toBe("sticky")
  })

  it("a pinned HEADER cell renders the header band's tint as an opaque color, not bg-background", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)

    fireEvent.click(screen.getByRole("button", { name: /columns/i }))
    fireEvent.click(screen.getByRole("button", { name: "Pin Name left" }))

    // getAllByText: the open Columns menu also renders a "Name" label — only
    // one of the matches sits inside a <th>.
    const th = screen
      .getAllByText("Name")
      .map((el) => el.closest("th"))
      .find(Boolean) as HTMLTableCellElement
    // TableHeader carries a translucent bg-muted/50 band; the sticky pinned
    // header cell must paint that SAME tint opaquely (the color-mix
    // equivalent) or scrolled columns bleed through it — and a plain
    // bg-background would visibly break the band.
    expect(th.className).toContain(
      "bg-[color-mix(in_srgb,var(--muted)_50%,var(--background))]",
    )
    expect(th.className).not.toContain("bg-background")
    expect(th.style.position).toBe("sticky")
    // The band itself lives on <thead>.
    expect(th.closest("thead")?.className).toContain("bg-muted/50")
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

describe("DataTable — row selection", () => {
  it("renders the gutter column and its checkboxes when enableRowSelection is true", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} enableRowSelection />)
    // Header select-all checkbox plus one per row are all always mounted —
    // row-gutter.tsx reveals/hides them via CSS row-hover/focus classes
    // rather than conditional rendering (see row-gutter.test.tsx), so the
    // full count is present from the start, before and after selecting.
    expect(screen.getAllByRole("checkbox")).toHaveLength(1 + DATA.length)
    fireEvent.click(screen.getAllByRole("checkbox")[0])
    expect(screen.getAllByRole("checkbox")).toHaveLength(1 + DATA.length)
  })

  it("does not render the gutter column by default", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    expect(screen.queryByRole("checkbox")).toBeNull()
  })

  // Regression test for a real bug caught in code review and confirmed live
  // in the browser: TanStack's row objects returned by successive
  // `table.getRowModel()` calls are NOT the same object instance as the
  // `row` a cell receives via CellContext, even for the same logical row —
  // getSortedRowModel rebuilds a fresh `{...row}` copy on every
  // recomputation. row-gutter.tsx originally used reference-based
  // `.indexOf(row)` to find a row's on-screen position (for both the
  // displayed row number and shift-click range selection), which always
  // returned -1 against a REAL table — this only surfaced against a real
  // <DataTable> render, not the isolated-cell unit tests in
  // row-gutter.test.tsx (which happened to place the exact same row
  // reference into their mock row model). Sorting by a real column and
  // reading real rendered text is what actually catches this class of bug.
  it("row numbers reflect real on-screen (sorted) order, not row.index — and shift-click range-selects by that same real order", () => {
    // Ages deliberately don't overlap with 1/2/3 so they can't be confused
    // with row-gutter numbers when asserting on rendered text below.
    const rows: Row[] = [
      { id: "a", name: "Charlie", age: 30 },
      { id: "b", name: "Alice", age: 10 },
      { id: "c", name: "Bob", age: 20 },
    ]
    render(<DataTable data={rows} columns={columns()} getRowId={(r) => r.id} enableRowSelection />)

    // Sort ascending by Name: Alice(b), Bob(c), Charlie(a).
    fireEvent.click(screen.getByRole("button", { name: /Name/ }))

    const rowsInDisplayOrder = screen.getAllByRole("row").slice(1) // drop the header row
    const numberCells = rowsInDisplayOrder.map((r) => r.querySelector("td:first-child span.tabular-nums"))
    expect(numberCells.map((el) => el?.textContent)).toEqual(["1", "2", "3"])
    expect(rowsInDisplayOrder.map((r) => r.textContent)).toEqual([
      expect.stringContaining("Alice"),
      expect.stringContaining("Bob"),
      expect.stringContaining("Charlie"),
    ])

    // Shift-click range-select across the sorted (not original) order:
    // click Alice's checkbox, then shift-click Bob's — should select
    // exactly those two (displayed positions 0..1), not Alice+Charlie
    // (which original-array indices 1 and 0 would wrongly imply).
    const checkboxesInOrder = rowsInDisplayOrder.map(
      (r) => r.querySelector('[role="checkbox"]') as HTMLElement,
    )
    fireEvent.click(checkboxesInOrder[0])
    fireEvent.click(checkboxesInOrder[1], { shiftKey: true })
    expect(rowsInDisplayOrder.map((r) => r.querySelector('[role="checkbox"]')?.getAttribute("aria-checked"))).toEqual(
      ["true", "true", "false"],
    )
  })
})

describe("DataTable — paste creates rows", () => {
  it("passes onCreateRows through to useDataTable so a paste extending past the last row is reported", async () => {
    // DATA has 2 rows, so the paste block must span 3 lines starting at row
    // 0 for the third line ("Chris") to land past the last existing row and
    // count as an overflow row rather than an update to an existing one.
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn(),
        readText: vi.fn().mockResolvedValue("Bailey\t44\nAda\t30\nChris\t22"),
      },
      configurable: true,
      writable: true,
    })
    const onCreateRows = vi.fn()
    const { container } = render(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        editable
        onCreateRows={onCreateRows}
      />,
    )
    const firstCell = container.querySelector("tbody tr td div[tabindex]") as HTMLElement
    act(() => {
      firstCell.focus()
      fireEvent.focus(firstCell)
    })
    await act(async () =>
      fireEvent.keyDown(container.querySelector(".rounded-md.border")!, {
        key: "v",
        ctrlKey: true,
      }),
    )
    expect(onCreateRows).toHaveBeenCalledWith([{ name: "Chris", age: 22 }])
  })
})

describe("DataTable — footer calc", () => {
  it("renders a footer with the aggregated value when calculableColumns is set", () => {
    render(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        calculableColumns={[{ columnId: "age", default: "sum" }]}
      />,
    )
    // Fixture is DATA = [{ age: 44 }, { age: 30 }] (see the top of this
    // file) — sum is 74, confirmed against the actual fixture rather than
    // computed at test-run time, so a future edit to DATA that silently
    // changes the sum makes this test fail loudly instead of drifting.
    expect(screen.getByText("74")).toBeInTheDocument()
  })

  it("renders no footer when calculableColumns is not set", () => {
    const { container } = render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    expect(container.querySelector("tfoot")).toBeNull()
  })
})

describe("DataTable — export CSV", () => {
  it("omits the Export button when enableExport is false", () => {
    render(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        enableExport={false}
      />,
    )
    expect(screen.queryByRole("button", { name: "Export" })).toBeNull()
  })

  it("renders an Export CSV button that downloads the current (sorted/filtered/visible) view", () => {
    // downloadCsv is a thin DOM wrapper (Blob + anchor click) with no
    // jsdom-observable side effect worth asserting on directly — spy on the
    // live module binding instead of inspecting the DOM download. A plain
    // `vi.doMock("./export-csv", ...)` can't work here: this file's static
    // `import { DataTable } from "./data-table"` at the top is hoisted and
    // resolved (pulling in data-table.tsx's own `./export-csv` import) long
    // before any vi.doMock call inside a test body would run, so the mock
    // would never apply. Importing the module namespace object
    // (`import * as ExportCsvModule`) and spying on it instead works because
    // Vitest's ESM transform routes both this test's and data-table.tsx's
    // `downloadCsv` references through the same mutable module object.
    const downloadSpy = vi.spyOn(ExportCsvModule, "downloadCsv").mockImplementation(() => {})
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    fireEvent.click(screen.getByRole("button", { name: "Export" }))
    expect(downloadSpy).toHaveBeenCalled()
    const [filename, csv] = downloadSpy.mock.calls[0]
    expect(filename).toMatch(/\.csv$/)
    expect(csv).toContain("Name,Age")
    expect(csv).toContain("Bailey")
    expect(csv).toContain("Ada")
    downloadSpy.mockRestore()
  })

  it("excludes a hidden column from the exported CSV", () => {
    const downloadSpy = vi.spyOn(ExportCsvModule, "downloadCsv").mockImplementation(() => {})
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    fireEvent.click(screen.getByRole("button", { name: /columns/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Age" }))
    fireEvent.click(screen.getByRole("button", { name: "Export" }))
    expect(downloadSpy).toHaveBeenCalled()
    const [, csv] = downloadSpy.mock.calls[0]
    expect(csv.split("\r\n")[0]).toBe("Name")
    expect(csv).not.toContain("Age")
    downloadSpy.mockRestore()
  })

  it("excludes the row-gutter (selection) column from the exported CSV when enableRowSelection is on", () => {
    const downloadSpy = vi.spyOn(ExportCsvModule, "downloadCsv").mockImplementation(() => {})
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} enableRowSelection />)
    fireEvent.click(screen.getByRole("button", { name: "Export" }))
    expect(downloadSpy).toHaveBeenCalled()
    const [, csv] = downloadSpy.mock.calls[0]
    // Exact-equality (not .toContain) so a regression in the
    // ROW_GUTTER_COLUMN_ID filter — which would fall back to the raw id
    // "__row-gutter__" as an extra header column via meta?.label ?? column.id
    // — is actually caught, not silently accepted by a looser substring check.
    expect(csv.split("\r\n")[0]).toBe("Name,Age")
    downloadSpy.mockRestore()
  })

  it("exports only the selected rows when a selection exists", () => {
    const downloadSpy = vi.spyOn(ExportCsvModule, "downloadCsv").mockImplementation(() => {})
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} enableRowSelection />)
    // checkbox[0] is the header select-all; [1] = Bailey, [2] = Ada (DOM/row
    // order). Select only Ada, so the export must narrow to that one row.
    fireEvent.click(screen.getAllByRole("checkbox")[2])
    fireEvent.click(screen.getByRole("button", { name: "Export" }))
    expect(downloadSpy).toHaveBeenCalled()
    const [, csv] = downloadSpy.mock.calls[0]
    expect(csv).toContain("Ada")
    expect(csv).not.toContain("Bailey")
    downloadSpy.mockRestore()
  })

  it("exports every row when nothing is selected, even with selection enabled", () => {
    const downloadSpy = vi.spyOn(ExportCsvModule, "downloadCsv").mockImplementation(() => {})
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} enableRowSelection />)
    fireEvent.click(screen.getByRole("button", { name: "Export" }))
    const [, csv] = downloadSpy.mock.calls[0]
    expect(csv).toContain("Bailey")
    expect(csv).toContain("Ada")
    downloadSpy.mockRestore()
  })

  // Regression: an "all matching" logical selection under manual pagination
  // used to narrow the export to the loaded/selected subset and toast a plain
  // "Exported 2 rows" — a silently truncated CSV presented as complete.
  it("exports all loaded rows and reports the partial scope when 'all matching' is selected under manual pagination", () => {
    const downloadSpy = vi.spyOn(ExportCsvModule, "downloadCsv").mockImplementation(() => {})
    render(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        enableRowSelection
        manualPagination
        totalRowCount={100}
      />,
    )
    // Select-all click cycle: none → all loaded → all matching (the second
    // click is offered because totalRowCount exceeds the 2 loaded rows).
    const selectAll = screen.getAllByRole("checkbox")[0]
    fireEvent.click(selectAll)
    fireEvent.click(selectAll)

    fireEvent.click(screen.getByRole("button", { name: "Export" }))
    const [, csv] = downloadSpy.mock.calls[0]
    expect(csv).toContain("Bailey")
    expect(csv).toContain("Ada")
    expect(toast).toHaveBeenCalledWith(
      "Exported 2 of 100 matching rows to CSV — only loaded rows can be exported",
    )
    downloadSpy.mockRestore()
  })
})

describe("DataTable — filters and actions toolbar", () => {
  it("omits the Filters and Actions buttons when filterableColumns/actions aren't provided", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    expect(screen.queryByRole("button", { name: /filters/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /actions/i })).toBeNull()
  })

  it("renders the Filters button next to Columns and filters rows via the builder", () => {
    render(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        filterableColumns={[{ id: "name", label: "Name", type: "text" }]}
      />,
    )
    expect(screen.getByText("Bailey")).toBeInTheDocument()
    expect(screen.getByText("Ada")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /filters/i }))
    fireEvent.click(screen.getByRole("button", { name: /add filter group/i }))
    fireEvent.change(screen.getByLabelText("Filter value for Name"), {
      target: { value: "Ada" },
    })

    expect(screen.queryByText("Bailey")).toBeNull()
    expect(screen.getByText("Ada")).toBeInTheDocument()
  })

  it("renders a configured Actions dropdown with a chevron-down trigger, invoking onClick with selected rows", () => {
    const onClick = vi.fn()
    render(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        enableRowSelection
        actions={[{ id: "archive", label: "Archive", onClick }]}
      />,
    )
    const trigger = screen.getByRole("button", { name: /actions/i })
    expect(trigger.querySelector("svg")).toBeInTheDocument() // ChevronDown icon

    fireEvent.click(screen.getAllByRole("checkbox")[1]) // select "Bailey" (row "1")
    fireEvent.click(trigger)
    fireEvent.click(screen.getByText("Archive"))
    expect(onClick).toHaveBeenCalledWith({ rowIds: ["1"], rows: [DATA[0]], allMatching: false })
  })

  it("puts Export CSV on the opposite side of the toolbar from Columns/Filters/Actions", () => {
    render(
      <DataTable
        data={DATA}
        columns={columns()}
        getRowId={(r) => r.id}
        filterableColumns={[{ id: "name", label: "Name", type: "text" }]}
        actions={[{ id: "archive", label: "Archive", onClick: vi.fn() }]}
      />,
    )
    const toolbar = screen.getByRole("button", { name: /columns/i }).closest(
      "div.flex.items-center.justify-between",
    ) as HTMLElement
    expect(toolbar).not.toBeNull()
    const exportButton = screen.getByRole("button", { name: "Export" })
    // Export CSV is a direct child of the justify-between row, not nested
    // inside the left-hand gap-2 group with Columns/Filters/Actions.
    expect(exportButton.parentElement).toBe(toolbar)
  })
})

describe("DataTable — column resizing", () => {
  it("renders a resize handle only on resizable columns, not on the row-gutter", () => {
    render(
      <DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} enableRowSelection />,
    )
    expect(screen.getByRole("separator", { name: "Resize Name column" })).toBeInTheDocument()
    expect(screen.getByRole("separator", { name: "Resize Age column" })).toBeInTheDocument()
    // row-gutter.tsx sets enableResizing: false, so it gets no handle.
    expect(screen.queryAllByRole("separator")).toHaveLength(2)
  })

  it("dragging the handle grows the column via columnSizing state", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    const th = screen.getByText("Name").closest("th") as HTMLTableCellElement
    expect(th.style.width).toBe("150px") // TanStack's default column size

    const handle = screen.getByRole("separator", { name: "Resize Name column" })
    fireEvent.mouseDown(handle, { clientX: 100 })
    fireEvent.mouseMove(document, { clientX: 160 })
    fireEvent.mouseUp(document, { clientX: 160 })

    expect(th.style.width).toBe("210px")
  })

  it("double-clicking the handle resets the column to its default size", () => {
    render(<DataTable data={DATA} columns={columns()} getRowId={(r) => r.id} />)
    const th = screen.getByText("Name").closest("th") as HTMLTableCellElement
    const handle = screen.getByRole("separator", { name: "Resize Name column" })

    fireEvent.mouseDown(handle, { clientX: 100 })
    fireEvent.mouseMove(document, { clientX: 160 })
    fireEvent.mouseUp(document, { clientX: 160 })
    expect(th.style.width).toBe("210px")

    fireEvent.doubleClick(handle)
    expect(th.style.width).toBe("150px")
  })
})
