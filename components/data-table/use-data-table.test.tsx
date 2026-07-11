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
