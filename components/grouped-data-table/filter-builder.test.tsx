import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FilterBuilderContent } from "./filter-builder"
import type { FilterCondition, FilterDef } from "./types"

const defs: FilterDef[] = [
  { id: "bank", label: "Bank", type: "text" },
  { id: "balance", label: "Balance", type: "number" },
]

describe("FilterBuilderContent", () => {
  it("adds a default condition when 'Add filter' is clicked", async () => {
    const onConditionsChange = vi.fn()
    render(
      <FilterBuilderContent
        filterableColumns={defs}
        conditions={[]}
        onConditionsChange={onConditionsChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /add filter/i }))
    expect(onConditionsChange).toHaveBeenCalledTimes(1)
    const next = onConditionsChange.mock.calls[0][0] as FilterCondition[]
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ columnId: "bank", operator: "contains", value: null })
  })

  it("updates the value as the user types into a text condition", async () => {
    const onConditionsChange = vi.fn()
    const conditions: FilterCondition[] = [
      { id: "c1", columnId: "bank", operator: "contains", value: null },
    ]
    render(
      <FilterBuilderContent
        filterableColumns={defs}
        conditions={conditions}
        onConditionsChange={onConditionsChange}
      />,
    )
    await userEvent.type(screen.getByLabelText("Filter value for Bank"), "H")
    expect(onConditionsChange).toHaveBeenCalledWith([
      { id: "c1", columnId: "bank", operator: "contains", value: "H" },
    ])
  })

  it("removes a condition when its remove button is clicked", async () => {
    const onConditionsChange = vi.fn()
    const conditions: FilterCondition[] = [
      { id: "c1", columnId: "bank", operator: "contains", value: "HSBC" },
    ]
    render(
      <FilterBuilderContent
        filterableColumns={defs}
        conditions={conditions}
        onConditionsChange={onConditionsChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /remove filter/i }))
    expect(onConditionsChange).toHaveBeenCalledWith([])
  })
})
