import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useGridNavigation } from "./use-grid-navigation"

const ROW_IDS = ["r1", "r2", "r3"]
const COL_IDS = ["a", "b", "c"]

function setup(isColumnEditable: (columnId: string) => boolean = () => true) {
  return renderHook(() =>
    useGridNavigation({ rowIds: ROW_IDS, columnIds: COL_IDS, isColumnEditable }),
  )
}

describe("useGridNavigation", () => {
  it("starts with no active or editing cell", () => {
    const { result } = setup()
    expect(result.current.activeCell).toBeNull()
    expect(result.current.editingCell).toBeNull()
  })

  it("setActiveCell sets the active cell and isActive reflects it", () => {
    const { result } = setup()
    act(() => result.current.setActiveCell({ rowId: "r2", columnId: "b" }))
    expect(result.current.activeCell).toEqual({ rowId: "r2", columnId: "b" })
    expect(result.current.isActive({ rowId: "r2", columnId: "b" })).toBe(true)
    expect(result.current.isActive({ rowId: "r1", columnId: "b" })).toBe(false)
  })

  it("moveActive moves next/prev/up/down and wraps rows on next/prev", () => {
    const { result } = setup()
    act(() => result.current.setActiveCell({ rowId: "r1", columnId: "c" }))
    act(() => result.current.moveActive("next")) // wraps to next row, first col
    expect(result.current.activeCell).toEqual({ rowId: "r2", columnId: "a" })
    act(() => result.current.moveActive("prev")) // wraps back
    expect(result.current.activeCell).toEqual({ rowId: "r1", columnId: "c" })
    act(() => result.current.moveActive("down"))
    expect(result.current.activeCell).toEqual({ rowId: "r2", columnId: "c" })
    act(() => result.current.moveActive("up"))
    expect(result.current.activeCell).toEqual({ rowId: "r1", columnId: "c" })
  })

  it("moveActive clamps at the grid start (up/prev at r1/a)", () => {
    const { result } = setup()
    act(() => result.current.setActiveCell({ rowId: "r1", columnId: "a" }))
    act(() => result.current.moveActive("up"))
    expect(result.current.activeCell).toEqual({ rowId: "r1", columnId: "a" })
    act(() => result.current.moveActive("prev"))
    expect(result.current.activeCell).toEqual({ rowId: "r1", columnId: "a" })
  })

  it("moveActive clamps at the grid end (down/next at the last row/column)", () => {
    const { result } = setup()
    act(() => result.current.setActiveCell({ rowId: "r3", columnId: "c" }))
    act(() => result.current.moveActive("down"))
    expect(result.current.activeCell).toEqual({ rowId: "r3", columnId: "c" })
    act(() => result.current.moveActive("next"))
    expect(result.current.activeCell).toEqual({ rowId: "r3", columnId: "c" })
  })

  it("moveActive is a no-op on an empty grid", () => {
    const { result } = renderHook(() =>
      useGridNavigation({ rowIds: [], columnIds: [], isColumnEditable: () => true }),
    )
    act(() => result.current.moveActive("next"))
    expect(result.current.activeCell).toBeNull()
  })

  it("setActiveCell exits edit mode on a different cell", () => {
    const { result } = setup()
    act(() => result.current.beginEdit({ rowId: "r1", columnId: "a" }))
    expect(result.current.editingCell).toEqual({ rowId: "r1", columnId: "a" })
    act(() => result.current.setActiveCell({ rowId: "r2", columnId: "b" }))
    expect(result.current.editingCell).toBeNull()
    expect(result.current.activeCell).toEqual({ rowId: "r2", columnId: "b" })
  })

  it("beginEdit enters edit mode only for editable columns", () => {
    const { result } = setup((columnId) => columnId === "a")
    act(() => result.current.beginEdit({ rowId: "r1", columnId: "b" }))
    expect(result.current.editingCell).toBeNull()
    act(() => result.current.beginEdit({ rowId: "r1", columnId: "a" }))
    expect(result.current.editingCell).toEqual({ rowId: "r1", columnId: "a" })
    expect(result.current.isEditing({ rowId: "r1", columnId: "a" })).toBe(true)
  })

  it("stopEditing clears editingCell but keeps activeCell", () => {
    const { result } = setup()
    act(() => result.current.beginEdit({ rowId: "r1", columnId: "a" }))
    act(() => result.current.stopEditing())
    expect(result.current.editingCell).toBeNull()
    expect(result.current.activeCell).toEqual({ rowId: "r1", columnId: "a" })
  })

  it("moveActive exits edit mode", () => {
    const { result } = setup()
    act(() => result.current.beginEdit({ rowId: "r1", columnId: "a" }))
    act(() => result.current.moveActive("next"))
    expect(result.current.editingCell).toBeNull()
  })

  it("handleKeyDown: arrow keys move, Enter begins edit, Escape exits edit", () => {
    const { result } = setup()
    act(() => result.current.setActiveCell({ rowId: "r1", columnId: "a" }))
    const preventDefault = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake KeyboardEvent for testing
    act(() => result.current.handleKeyDown({ key: "ArrowDown", preventDefault } as any))
    expect(result.current.activeCell).toEqual({ rowId: "r2", columnId: "a" })
    expect(preventDefault).toHaveBeenCalled()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake KeyboardEvent for testing
    act(() => result.current.handleKeyDown({ key: "Enter", preventDefault } as any))
    expect(result.current.editingCell).toEqual({ rowId: "r2", columnId: "a" })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake KeyboardEvent for testing
    act(() => result.current.handleKeyDown({ key: "Escape", preventDefault } as any))
    expect(result.current.editingCell).toBeNull()
  })
})
