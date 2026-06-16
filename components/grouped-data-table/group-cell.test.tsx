import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { Cell, Row } from "@tanstack/react-table"

import { GroupCell } from "./group-cell"
import { GROUP_COLUMN_ID, type GroupColumnConfig } from "./types"

type Acct = { id: string; name: string }

const groupColumn: GroupColumnConfig<Acct> = {
  renderLeaf: (row) => <span>leaf:{row.original.name}</span>,
  indentSize: 24,
}

function groupCell(opts: {
  depth: number
  groupedValue: string
  leafCount: number
  expanded: boolean
}): Cell<Acct, unknown> {
  const row = {
    depth: opts.depth,
    getIsExpanded: () => opts.expanded,
    getCanExpand: () => true,
    getToggleExpandedHandler: () => () => {},
    getLeafRows: () => new Array(opts.leafCount).fill(null),
    subRows: new Array(opts.leafCount).fill(null),
  } as unknown as Row<Acct>
  return {
    column: { id: GROUP_COLUMN_ID },
    row,
    getValue: () => opts.groupedValue,
    getIsGrouped: () => true,
    getIsAggregated: () => false,
    getIsPlaceholder: () => false,
  } as unknown as Cell<Acct, unknown>
}

describe("GroupCell", () => {
  it("renders grouped label with leaf-descendant count", () => {
    const cell = groupCell({
      depth: 0,
      groupedValue: "Coffee Inc",
      leafCount: 7,
      expanded: true,
    })
    render(<GroupCell cell={cell} groupColumn={groupColumn} />)
    expect(screen.getByText(/Coffee Inc/)).toBeInTheDocument()
    expect(screen.getByText(/\(7\)/)).toBeInTheDocument()
  })

  it("renders the immediate sub-row count when countMode is 'immediate'", () => {
    // subRows (2) deliberately differs from leaf descendants (9) so the two
    // count branches are distinguishable at the render level.
    const row = {
      depth: 0,
      getIsExpanded: () => true,
      getCanExpand: () => true,
      getToggleExpandedHandler: () => () => {},
      getLeafRows: () => new Array(9).fill(null),
      subRows: new Array(2).fill(null),
    } as unknown as Row<Acct>
    const cell = {
      column: { id: GROUP_COLUMN_ID },
      row,
      getValue: () => "Holding BV",
      getIsGrouped: () => true,
      getIsAggregated: () => false,
      getIsPlaceholder: () => false,
    } as unknown as Cell<Acct, unknown>
    render(
      <GroupCell
        cell={cell}
        groupColumn={{ ...groupColumn, countMode: "immediate" }}
      />,
    )
    expect(screen.getByText(/\(2\)/)).toBeInTheDocument()
    expect(screen.queryByText(/\(9\)/)).not.toBeInTheDocument()
  })

  it("renders the leaf renderer for a leaf row in the group column", () => {
    const row = {
      depth: 1,
      original: { id: "1", name: "Payroll" },
      getIsExpanded: () => false,
      getCanExpand: () => false,
    } as unknown as Row<Acct>
    const cell = {
      column: { id: GROUP_COLUMN_ID },
      row,
      getValue: () => undefined,
      getIsGrouped: () => false,
      getIsAggregated: () => false,
      getIsPlaceholder: () => false,
    } as unknown as Cell<Acct, unknown>
    render(<GroupCell cell={cell} groupColumn={groupColumn} />)
    expect(screen.getByText("leaf:Payroll")).toBeInTheDocument()
  })

  it("renders nothing for a placeholder cell", () => {
    const cell = {
      column: { id: "currency" },
      row: { depth: 1 } as unknown as Row<Acct>,
      getIsGrouped: () => false,
      getIsAggregated: () => false,
      getIsPlaceholder: () => true,
    } as unknown as Cell<Acct, unknown>
    const { container } = render(
      <GroupCell cell={cell} groupColumn={groupColumn} />,
    )
    expect(container.textContent).toBe("")
  })
})
