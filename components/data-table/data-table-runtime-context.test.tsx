import { render, screen } from "@testing-library/react"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { DataTableRuntimeContext, useDataTableRuntime } from "./data-table-runtime-context"
import type { DataTableRuntime } from "./types"

const STUB_RUNTIME: DataTableRuntime = {
  activeCell: null,
  editingCell: null,
  isActive: () => false,
  isEditing: () => false,
  setActiveCell: () => {},
  beginEdit: () => {},
  stopEditing: () => {},
  moveActive: () => {},
  isColumnEditable: () => false,
  updateData: () => {},
  handleKeyDown: () => {},
  manualPagination: false,
  totalRowCount: undefined,
  isAllMatchingSelected: false,
  setAllMatchingSelected: () => {},
  toggleRowSelected: () => {},
}

function Probe() {
  const runtime = useDataTableRuntime()
  return <span>{runtime ? "has-runtime" : "no-runtime"}</span>
}

describe("DataTableRuntimeContext", () => {
  it("defaults to null outside a provider", () => {
    render(<Probe />)
    expect(screen.getByText("no-runtime")).toBeInTheDocument()
  })

  it("provides the runtime value inside a provider", () => {
    render(
      <DataTableRuntimeContext.Provider value={STUB_RUNTIME}>
        <Probe />
      </DataTableRuntimeContext.Provider>,
    )
    expect(screen.getByText("has-runtime")).toBeInTheDocument()
  })
})
