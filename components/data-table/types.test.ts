import { describe, expect, it } from "vitest"
import type { CellPos, DataTableColumnMeta, DataTableRuntime } from "./types"

describe("data-table core types", () => {
  it("CellPos has rowId and columnId", () => {
    const pos: CellPos = { rowId: "1", columnId: "name" }
    expect(pos.rowId).toBe("1")
    expect(pos.columnId).toBe("name")
  })

  it("DataTableColumnMeta carries editable and label", () => {
    const meta: DataTableColumnMeta = { editable: true, label: "Name" }
    expect(meta.editable).toBe(true)
    expect(meta.label).toBe("Name")
  })

  it("a conforming DataTableRuntime object type-checks", () => {
    const pos: CellPos = { rowId: "1", columnId: "name" }
    const runtime: DataTableRuntime = {
      activeCell: pos,
      editingCell: null,
      isActive: () => true,
      isEditing: () => false,
      setActiveCell: () => {},
      beginEdit: () => {},
      stopEditing: () => {},
      moveActive: () => {},
      isColumnEditable: () => true,
      updateData: () => {},
      handleKeyDown: () => {},
      manualPagination: false,
      totalRowCount: undefined,
      isAllMatchingSelected: false,
      setAllMatchingSelected: () => {},
      toggleRowSelected: () => {},
    }
    expect(runtime.activeCell).toEqual(pos)
  })
})
