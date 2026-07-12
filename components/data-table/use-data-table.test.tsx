import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { defineColumns } from "./define-columns"
import { useDataTable } from "./use-data-table"

type Row = { id: string; name: string; age: number }

const DATA: Row[] = [
  { id: "1", name: "Bailey", age: 44 },
  { id: "2", name: "Ada", age: 30 },
]

describe("useDataTable", () => {
  it("builds a table with rows from data using getRowId", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name"), col.number("age")],
        getRowId: (row) => row.id,
      }),
    )
    expect(result.current.table.getRowModel().rows.map((r) => r.id)).toEqual(["1", "2"])
  })

  it("defaults getRowId to the row index when not provided", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")] }),
    )
    expect(result.current.table.getRowModel().rows.map((r) => r.id)).toEqual(["0", "1"])
  })

  it("isColumnEditable resolves column override over the table default", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name", { editable: false }), col.number("age")],
        editable: true,
      }),
    )
    expect(result.current.runtime.isColumnEditable("name")).toBe(false) // column override wins
    expect(result.current.runtime.isColumnEditable("age")).toBe(true) // falls back to table default
  })

  // Regression guard: with a table-level `editable: true` default, a column
  // built from a field with no `edit` renderer (col.multiSelect, col.button)
  // must still resolve as non-editable. Without this, useGridNavigation's
  // beginEdit (invoked directly by handleKeyDown on Enter) would pass its
  // isColumnEditable check, set editingCell, and freeze keyboard nav — the
  // cell's own field.edit is undefined so no editor ever renders, but
  // handleKeyDown now believes it's mid-edit and swallows every key except
  // Escape.
  it("a field with no edit renderer (multiSelect/button) is never editable, even under a table-level editable default", () => {
    type TagsRow = { id: string; tags: string[] }
    const tagsCol = defineColumns<TagsRow>()
    const { result: msResult } = renderHook(() =>
      useDataTable({
        data: [{ id: "1", tags: ["a"] }],
        columns: [tagsCol.multiSelect("tags", { options: [{ value: "a", label: "A" }] })],
        editable: true,
      }),
    )
    expect(msResult.current.runtime.isColumnEditable("tags")).toBe(false)

    const col = defineColumns<Row>()
    const { result: btnResult } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.button("action", { label: "Go", onClick: () => {} })],
        editable: true,
      }),
    )
    expect(btnResult.current.runtime.isColumnEditable("action")).toBe(false)
  })

  it("runtime.updateData calls the onUpdateData callback", () => {
    const onUpdateData = vi.fn()
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name")],
        getRowId: (row) => row.id,
        onUpdateData,
      }),
    )
    act(() => result.current.runtime.updateData("1", "name", "Grace"))
    expect(onUpdateData).toHaveBeenCalledWith("1", "name", "Grace")
  })

  it("sorting state is wired: toggling a column's sort updates table.getState().sorting", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.number("age")], getRowId: (row) => row.id }),
    )
    act(() => result.current.table.getColumn("age")!.toggleSorting(false))
    expect(result.current.table.getState().sorting).toEqual([{ id: "age", desc: false }])
  })

  it("revalidates activeCell with a column-stable, clamped-index snap when the active row disappears", () => {
    // use-grid-navigation.ts's module doc and moveActive's orphaned-id
    // comment both explicitly delegate this responsibility to
    // use-data-table.ts: an activeCell pointing at a row/column id that has
    // been removed (sort/filter/delete, or here a whole new `data` array) is
    // a dead end for keyboard navigation unless something revalidates it.
    //
    // The revalidation snap is column-stable and index-clamped (like
    // Excel/Sheets): it does NOT jump back to the first cell in the grid.
    // Three rows are used here (rather than two) so deleting the active
    // *middle* row demonstrates that the snap lands on whichever row slides
    // into the vanished row's old index — not on rowIds[0].
    const col = defineColumns<Row>()
    const START_DATA: Row[] = [
      { id: "1", name: "Bailey", age: 44 },
      { id: "2", name: "Ada", age: 30 },
      { id: "3", name: "Cass", age: 22 },
    ]
    const { result, rerender } = renderHook(
      (props: { data: Row[] }) =>
        useDataTable({
          data: props.data,
          columns: [col.text("name"), col.number("age")],
          getRowId: (row) => row.id,
        }),
      { initialProps: { data: START_DATA } },
    )

    // Focus row "2" (Ada, index 1 of ["1", "2", "3"]), column "name".
    act(() => result.current.runtime.setActiveCell({ rowId: "2", columnId: "name" }))
    expect(result.current.runtime.activeCell).toEqual({ rowId: "2", columnId: "name" })

    // Delete row "2" (index 1). Row "3" (previously at index 2) slides into
    // index 1 of the new rowIds list (["1", "3"]).
    const NEXT_DATA: Row[] = [
      { id: "1", name: "Bailey", age: 44 },
      { id: "3", name: "Cass", age: 22 },
    ]
    rerender({ data: NEXT_DATA })

    // Column-stable, clamped-index snap: row "2" vanished from index 1, so
    // activeCell moves to whatever now sits at index 1 in the new rowIds
    // list — row "3" — NOT rowIds[0] ("1"). The column ("name") is
    // preserved because it's still valid.
    expect(result.current.runtime.activeCell).toEqual({ rowId: "3", columnId: "name" })

    // And keyboard navigation must still work afterward (not frozen).
    act(() => result.current.runtime.moveActive("next"))
    expect(result.current.runtime.activeCell).toEqual({ rowId: "3", columnId: "age" })
  })

  it("revalidates activeCell with a row-stable, clamped-index snap when the active column disappears", () => {
    // Symmetric coverage for the column side of the same revalidation
    // effect: hiding the active column (e.g. via the columns menu) must not
    // jump activeCell back to columnIds[0] — it should land on whichever
    // column slides into the vanished column's old index, with the row
    // preserved. Three columns are used so hiding the active *middle*
    // column demonstrates the clamped-index snap rather than a trivial
    // single-remaining-column case.
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name"), col.number("age"), col.text("id")],
        getRowId: (row) => row.id,
      }),
    )

    // Focus row "1", column "age" (index 1 of ["name", "age", "id"]).
    act(() => result.current.runtime.setActiveCell({ rowId: "1", columnId: "age" }))
    expect(result.current.runtime.activeCell).toEqual({ rowId: "1", columnId: "age" })

    // Hide column "age" (index 1). Column "id" (previously at index 2)
    // slides into index 1 of the new columnIds list (["name", "id"]).
    act(() => {
      result.current.table.getColumn("age")?.toggleVisibility(false)
    })

    // Row-stable, clamped-index snap: column "age" vanished from index 1,
    // so activeCell moves to whatever now sits at index 1 in the new
    // columnIds list — column "id" — NOT columnIds[0] ("name"). The row
    // ("1") is preserved because it's still valid.
    expect(result.current.runtime.activeCell).toEqual({ rowId: "1", columnId: "id" })
  })

  it("leaves activeCell alone when the id lists change but the active cell is still valid", () => {
    const col = defineColumns<Row>()
    const { result, rerender } = renderHook(
      (props: { data: Row[] }) =>
        useDataTable({
          data: props.data,
          columns: [col.text("name"), col.number("age")],
          getRowId: (row) => row.id,
        }),
      { initialProps: { data: DATA } },
    )

    act(() => result.current.runtime.setActiveCell({ rowId: "1", columnId: "name" }))

    // Add a new row; row "1" (the active one) is still present.
    const NEXT_DATA: Row[] = [...DATA, { id: "3", name: "Cass", age: 22 }]
    rerender({ data: NEXT_DATA })

    expect(result.current.runtime.activeCell).toEqual({ rowId: "1", columnId: "name" })
  })
})

describe("useDataTable — row selection", () => {
  it("enableRowSelection prepends the gutter column and it's excluded from keyboard-navigable columns", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name")],
        getRowId: (row) => row.id,
        enableRowSelection: true,
      }),
    )
    expect(result.current.table.getAllLeafColumns().map((c) => c.id)).toEqual([
      "__row-gutter__",
      "name",
    ])
    // Arrow-right from the (only) real column should be a no-op — the
    // gutter column must not be a stop in keyboard navigation.
    act(() => result.current.runtime.setActiveCell({ rowId: "1", columnId: "name" }))
    act(() => result.current.runtime.moveActive("next"))
    expect(result.current.runtime.activeCell?.columnId).not.toBe("__row-gutter__")
  })

  it("without enableRowSelection, no gutter column is added", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (row) => row.id }),
    )
    expect(result.current.table.getAllLeafColumns().map((c) => c.id)).toEqual(["name"])
  })

  it("runtime exposes manualPagination and totalRowCount as passed", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name")],
        getRowId: (row) => row.id,
        manualPagination: true,
        totalRowCount: 500,
      }),
    )
    expect(result.current.runtime.manualPagination).toBe(true)
    expect(result.current.runtime.totalRowCount).toBe(500)
  })

  it("setAllMatchingSelected(true) sets the flag and selects every loaded row", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name")],
        getRowId: (row) => row.id,
        enableRowSelection: true,
        manualPagination: true,
        totalRowCount: 500,
      }),
    )
    act(() => result.current.runtime.setAllMatchingSelected(true))
    expect(result.current.runtime.isAllMatchingSelected).toBe(true)
    expect(result.current.table.getIsAllRowsSelected()).toBe(true)
  })

  it("setAllMatchingSelected(false) clears the flag without forcing deselection", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({
        data: DATA,
        columns: [col.text("name")],
        getRowId: (row) => row.id,
        enableRowSelection: true,
      }),
    )
    act(() => result.current.runtime.setAllMatchingSelected(true))
    act(() => result.current.runtime.setAllMatchingSelected(false))
    expect(result.current.runtime.isAllMatchingSelected).toBe(false)
    // Rows stay selected — the row-gutter's own header click handler is the
    // one that decides whether clearing all-matching should also clear
    // every row (see row-gutter.test.tsx's "clears everything" case, which
    // exercises both calls together through the header's own click logic).
    expect(result.current.table.getIsAllRowsSelected()).toBe(true)
  })

  it("toggleRowSelected without shiftKey toggles just the one row, by id", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id, enableRowSelection: true }),
    )
    act(() => result.current.runtime.toggleRowSelected("1", true, false))
    expect(result.current.table.getRowModel().rows.map((r) => r.getIsSelected())).toEqual([true, false])
  })

  it("toggleRowSelected with shiftKey selects the inclusive range from the last-touched row", () => {
    const rows: Row[] = Array.from({ length: 6 }, (_, i) => ({ id: String(i), name: `Row ${i}`, age: i }))
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: rows, columns: [col.text("name")], getRowId: (r) => r.id, enableRowSelection: true }),
    )
    act(() => result.current.runtime.toggleRowSelected("1", true, false)) // plain click sets the anchor at row id "1"
    act(() => result.current.runtime.toggleRowSelected("4", true, true)) // shift-click extends "1".."4"
    expect(result.current.table.getRowModel().rows.map((r) => r.getIsSelected())).toEqual([
      false, true, true, true, true, false,
    ])
  })

  it("toggleRowSelected with shiftKey works in either direction from the anchor", () => {
    const rows: Row[] = Array.from({ length: 6 }, (_, i) => ({ id: String(i), name: `Row ${i}`, age: i }))
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: rows, columns: [col.text("name")], getRowId: (r) => r.id, enableRowSelection: true }),
    )
    act(() => result.current.runtime.toggleRowSelected("4", true, false)) // anchor at row id "4"
    act(() => result.current.runtime.toggleRowSelected("1", true, true)) // shift-click backwards extends "1".."4"
    expect(result.current.table.getRowModel().rows.map((r) => r.getIsSelected())).toEqual([
      false, true, true, true, true, false,
    ])
  })

  it("toggleRowSelected with shiftKey but no prior anchor falls back to toggling just the one row", () => {
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: DATA, columns: [col.text("name")], getRowId: (r) => r.id, enableRowSelection: true }),
    )
    act(() => result.current.runtime.toggleRowSelected("2", true, true))
    expect(result.current.table.getRowModel().rows.map((r) => r.getIsSelected())).toEqual([false, true])
  })

  // Regression coverage for a real bug caught in code review: `row.index` is
  // fixed at row creation to the row's position in the ORIGINAL, unsorted
  // `data` array — getSortedRowModel preserves it via a shallow copy rather
  // than reassigning it — so it is NOT the row's position in the
  // currently-displayed (sorted) order. An earlier version of
  // toggleRowSelected took a positional index and indexed straight into
  // `table.getRowModel().rows`, which broke (toggled the wrong row, or
  // no-op'd) as soon as the table was sorted. Using row id + a live
  // `findIndex` lookup instead sidesteps this: these tests sort the table
  // first, so a regression back to index-based lookup would toggle the
  // wrong row and fail here.
  it("toggleRowSelected resolves the correct row by id even after the table has been sorted (row.index would be stale/wrong here)", () => {
    const rows: Row[] = [
      { id: "a", name: "Charlie", age: 3 },
      { id: "b", name: "Alice", age: 1 },
      { id: "c", name: "Bob", age: 2 },
    ]
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: rows, columns: [col.text("name")], getRowId: (r) => r.id, enableRowSelection: true }),
    )
    act(() => result.current.table.setSorting([{ id: "name", desc: false }]))
    // Sorted ascending by name: Alice(b), Bob(c), Charlie(a) — id "b" is now
    // displayed FIRST even though it was originally the second row (index 1).
    expect(result.current.table.getRowModel().rows.map((r) => r.id)).toEqual(["b", "c", "a"])
    act(() => result.current.runtime.toggleRowSelected("b", true, false))
    const selectedIds = result.current.table.getRowModel().rows.filter((r) => r.getIsSelected()).map((r) => r.id)
    expect(selectedIds).toEqual(["b"])
  })

  it("toggleRowSelected shift-range resolves anchor and target by their current sorted position, not their original data-array index", () => {
    const rows: Row[] = [
      { id: "a", name: "Elm", age: 5 },
      { id: "b", name: "Ash", age: 2 },
      { id: "c", name: "Fir", age: 6 },
      { id: "d", name: "Birch", age: 3 },
      { id: "e", name: "Oak", age: 4 },
    ]
    const col = defineColumns<Row>()
    const { result } = renderHook(() =>
      useDataTable({ data: rows, columns: [col.text("name")], getRowId: (r) => r.id, enableRowSelection: true }),
    )
    act(() => result.current.table.setSorting([{ id: "name", desc: false }]))
    // Sorted ascending by name: Ash(b), Birch(d), Elm(a), Fir(c), Oak(e).
    expect(result.current.table.getRowModel().rows.map((r) => r.id)).toEqual(["b", "d", "a", "c", "e"])
    act(() => result.current.runtime.toggleRowSelected("b", true, false)) // anchor at displayed position 0
    act(() => result.current.runtime.toggleRowSelected("a", true, true)) // shift-click at displayed position 2 -> range 0..2
    const selectedIds = result.current.table.getRowModel().rows.filter((r) => r.getIsSelected()).map((r) => r.id)
    expect(selectedIds.sort()).toEqual(["a", "b", "d"])
  })
})
