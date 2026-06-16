import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FilterChips } from "./filter-chips"
import type { FilterCondition, FilterDef } from "./types"

const defs: FilterDef[] = [{ id: "balance", label: "Balance", type: "number" }]

describe("FilterChips", () => {
  it("renders a chip per condition and removes on click", async () => {
    const onRemove = vi.fn()
    const conditions: FilterCondition[] = [
      { id: "c1", columnId: "balance", operator: "gt", value: 100 },
    ]
    render(
      <FilterChips conditions={conditions} filterDefs={defs} onRemove={onRemove} />,
    )
    expect(screen.getByText("Balance > 100")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /remove balance > 100/i }))
    expect(onRemove).toHaveBeenCalledWith("c1")
  })

  it("renders nothing when there are no conditions", () => {
    const { container } = render(
      <FilterChips conditions={[]} filterDefs={defs} onRemove={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
