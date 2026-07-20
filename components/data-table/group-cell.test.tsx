import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { Cell } from "@tanstack/react-table"
import type * as React from "react"

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
  /**
   * Leaf-descendant count, used by `getLeafRows()`. Defaults to `subRowCount`
   * so existing callers (which don't distinguish the two) are unaffected;
   * pass a different value to exercise `countMode: "immediate"` vs. "leaf".
   */
  leafRowCount?: number
  aggregatedCell?: () => React.ReactNode
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
    leafRowCount = subRowCount,
    aggregatedCell,
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
      Array.from({ length: leafRowCount }, () => ({ getIsGrouped: () => false })),
    original: { id: "1", name: "Ada" },
  }
  return {
    row,
    column: {
      id: columnId,
      columnDef: { cell: () => "LEAF-VALUE", aggregatedCell },
    },
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

  it("pads a group row's cell instead of rendering flush against the edges", () => {
    // Regression: this branch previously had NO padding classes at all, only
    // a dynamic paddingLeft for indentation — cramped/inconsistent row
    // height next to sibling columns, which do carry padding.
    render(
      <GroupAwareCell
        cell={makeCell({ columnId: GROUP_COLUMN_ID, isGrouped: true, groupingValue: "Acme" })}
        groupColumn={{ header: "Account" }}
      />,
    )
    expect(screen.getByText("Acme").parentElement).toHaveClass("py-3", "pr-2")
  })

  it("truncates an overlong group label instead of hard-clipping it", () => {
    // Regression: no truncate/min-w-0 meant the cell's own overflow-hidden
    // clipped long content with no ellipsis at all — content just vanished
    // mid-word with no visual indication anything was cut.
    render(
      <GroupAwareCell
        cell={makeCell({
          columnId: GROUP_COLUMN_ID,
          isGrouped: true,
          groupingValue: "Wayne Industries Group Holdings International",
        })}
        groupColumn={{ header: "Account" }}
      />,
    )
    expect(screen.getByText("Wayne Industries Group Holdings International")).toHaveClass(
      "truncate",
      "min-w-0",
    )
  })

  it("renders developer leaf content on a leaf row's group column", () => {
    render(
      <GroupAwareCell
        cell={makeCell({ columnId: GROUP_COLUMN_ID })}
        groupColumn={{ leaf: { primary: (r) => r.original.name } }}
      />,
    )
    expect(screen.getByText("Ada")).toBeInTheDocument()
    expect(screen.getByText("Ada")).toHaveClass("truncate")
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

  it("renders the immediate sub-row count when countMode is 'immediate'", () => {
    // subRowCount (2) deliberately differs from leafRowCount (9) so the two
    // count branches are distinguishable at the render level.
    render(
      <GroupAwareCell
        cell={makeCell({
          columnId: GROUP_COLUMN_ID,
          isGrouped: true,
          groupingValue: "Holding BV",
          canExpand: true,
          subRowCount: 2,
          leafRowCount: 9,
        })}
        groupColumn={{ header: "Account", countMode: "immediate" }}
      />,
    )
    expect(screen.getByText("(2)")).toBeInTheDocument()
    expect(screen.queryByText("(9)")).not.toBeInTheDocument()
  })

  it("renders the declarative leaf's optional icon and secondary line", () => {
    render(
      <GroupAwareCell
        cell={makeCell({ columnId: GROUP_COLUMN_ID })}
        groupColumn={{
          leaf: {
            icon: () => <svg data-testid="leaf-icon" />,
            primary: (r) => r.original.name,
            secondary: () => "NL00 1234",
          },
        }}
      />,
    )
    expect(screen.getByText("Ada")).toBeInTheDocument()
    expect(screen.getByText("NL00 1234")).toBeInTheDocument()
    expect(screen.getByTestId("leaf-icon")).toBeInTheDocument()
  })

  it("prefers aggregatedCell over cell for an aggregated, non-group cell", () => {
    render(
      <GroupAwareCell
        cell={makeCell({
          columnId: "balance",
          isAggregated: true,
          aggregatedCell: () => <span>Total: 999</span>,
        })}
        groupColumn={{}}
      />,
    )
    expect(screen.getByText("Total: 999")).toBeInTheDocument()
    expect(screen.queryByText("LEAF-VALUE")).not.toBeInTheDocument()
  })
})
