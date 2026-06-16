import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FilterBuilderContent } from "./filter-builder"
import type { FilterDef, FilterState } from "./types"

const defs: FilterDef[] = [
  { id: "bank", label: "Bank", type: "text" },
  { id: "balance", label: "Balance", type: "number" },
]

const oneGroup: FilterState = {
  combinator: "and",
  groups: [
    { id: "g1", combinator: "and", conditions: [
      { id: "c1", columnId: "bank", operator: "contains", value: null },
    ] },
  ],
}

describe("FilterBuilderContent", () => {
  it("adds a group when there are none and 'Add filter group' is clicked", async () => {
    const onChange = vi.fn()
    render(
      <FilterBuilderContent
        filterableColumns={defs}
        filterState={{ combinator: "and", groups: [] }}
        onFilterStateChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /add filter group/i }))
    const next = onChange.mock.calls[0][0] as FilterState
    expect(next.groups).toHaveLength(1)
    expect(next.groups[0].conditions).toHaveLength(1)
  })

  it("adds a condition to an existing group", async () => {
    const onChange = vi.fn()
    render(
      <FilterBuilderContent filterableColumns={defs} filterState={oneGroup} onFilterStateChange={onChange} />,
    )
    await userEvent.click(screen.getByRole("button", { name: /^add filter$/i }))
    const next = onChange.mock.calls[0][0] as FilterState
    expect(next.groups[0].conditions).toHaveLength(2)
  })

  it("updates the value as the user types", async () => {
    const onChange = vi.fn()
    render(
      <FilterBuilderContent filterableColumns={defs} filterState={oneGroup} onFilterStateChange={onChange} />,
    )
    await userEvent.type(screen.getByLabelText("Filter value for Bank"), "H")
    const next = onChange.mock.calls.at(-1)![0] as FilterState
    expect(next.groups[0].conditions[0].value).toBe("H")
  })

  it("shows human-readable labels (not raw values) in the column and operator triggers", () => {
    const state: FilterState = {
      combinator: "and",
      groups: [
        { id: "g1", combinator: "and", conditions: [
          { id: "c1", columnId: "bank", operator: "isNot", value: null },
        ] },
      ],
    }
    render(
      <FilterBuilderContent filterableColumns={defs} filterState={state} onFilterStateChange={vi.fn()} />,
    )
    expect(screen.getByRole("combobox", { name: "Filter operator" })).toHaveTextContent("is not")
    expect(screen.getByRole("combobox", { name: "Filter column" })).toHaveTextContent("Bank")
  })

  it("removes a condition (and its now-empty group)", async () => {
    const onChange = vi.fn()
    render(
      <FilterBuilderContent filterableColumns={defs} filterState={oneGroup} onFilterStateChange={onChange} />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Remove filter" }))
    const next = onChange.mock.calls[0][0] as FilterState
    expect(next.groups).toHaveLength(0)
  })

  it("removes a whole group via the group's remove button", async () => {
    const onChange = vi.fn()
    const twoConditionGroup: FilterState = {
      combinator: "and",
      groups: [
        { id: "g1", combinator: "and", conditions: [
          { id: "c1", columnId: "bank", operator: "contains", value: "x" },
          { id: "c2", columnId: "balance", operator: "gt", value: 1 },
        ] },
      ],
    }
    render(
      <FilterBuilderContent
        filterableColumns={defs}
        filterState={twoConditionGroup}
        onFilterStateChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Remove filter group" }))
    const next = onChange.mock.calls[0][0] as FilterState
    expect(next.groups).toHaveLength(0)
  })
})
