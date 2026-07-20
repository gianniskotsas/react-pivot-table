import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { Cell } from "@tanstack/react-table"

import { GroupAwareCell } from "./group-cell"
import { GROUP_COLUMN_ID } from "./types"

type Row = { id: string; name: string }

/** Minimal Cell stub — GroupAwareCell only reads these members. */
function makeCell(overrides: {
  columnId: string
  isGrouped?: boolean
  isAggregated?: boolean
  isPlaceholder?: boolean
  groupingValue?: unknown
  depth?: number
  canExpand?: boolean
  isExpanded?: boolean
  subRowCount?: number
}): Cell<Row, unknown> {
  const {
    columnId,
    isGrouped = false,
    isAggregated = false,
    isPlaceholder = false,
    groupingValue,
    depth = 0,
    canExpand = false,
    isExpanded = false,
    subRowCount = 0,
  } = overrides
  const row = {
    depth,
    groupingValue,
    getIsGrouped: () => isGrouped,
    getCanExpand: () => canExpand,
    getIsExpanded: () => isExpanded,
    getToggleExpandedHandler: () => () => {},
    subRows: Array.from({ length: subRowCount }, () => ({ subRows: [] })),
    getLeafRows: () =>
      Array.from({ length: subRowCount }, () => ({ getIsGrouped: () => false })),
    original: { id: "1", name: "Ada" },
  }
  return {
    row,
    column: { id: columnId, columnDef: { cell: () => "LEAF-VALUE" } },
    getIsAggregated: () => isAggregated,
    getIsPlaceholder: () => isPlaceholder,
    getContext: () => ({}),
  } as unknown as Cell<Row, unknown>
}

describe("GroupAwareCell", () => {
  it("renders the grouping value and count on a group row's group column", () => {
    render(
      <GroupAwareCell
        cell={makeCell({
          columnId: GROUP_COLUMN_ID,
          isGrouped: true,
          groupingValue: "Acme",
          canExpand: true,
          subRowCount: 3,
        })}
        groupColumn={{ header: "Account" }}
      />,
    )
    expect(screen.getByText("Acme")).toBeInTheDocument()
    expect(screen.getByText("(3)")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Expand group" })).toBeInTheDocument()
  })

  it("renders developer leaf content on a leaf row's group column", () => {
    render(
      <GroupAwareCell
        cell={makeCell({ columnId: GROUP_COLUMN_ID })}
        groupColumn={{ leaf: { primary: (r) => r.original.name } }}
      />,
    )
    expect(screen.getByText("Ada")).toBeInTheDocument()
  })

  it("renders nothing for a placeholder cell", () => {
    const { container } = render(
      <GroupAwareCell
        cell={makeCell({ columnId: "name", isPlaceholder: true })}
        groupColumn={{}}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("falls through to the column's own cell renderer on a normal leaf cell", () => {
    render(
      <GroupAwareCell cell={makeCell({ columnId: "name" })} groupColumn={{}} />,
    )
    expect(screen.getByText("LEAF-VALUE")).toBeInTheDocument()
  })
})
