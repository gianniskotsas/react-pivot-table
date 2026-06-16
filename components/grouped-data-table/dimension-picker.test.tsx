import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DimensionPickerContent, reorderGrouping } from "./dimension-picker"

const dimensions = [
  { id: "entity", label: "Entity" },
  { id: "bank", label: "Bank" },
]

describe("reorderGrouping", () => {
  it("moves active id to the over id position", () => {
    expect(reorderGrouping(["entity", "bank"], "bank", "entity")).toEqual([
      "bank",
      "entity",
    ])
  })
  it("returns the input unchanged when an id is missing", () => {
    expect(reorderGrouping(["entity", "bank"], "ghost", "entity")).toEqual([
      "entity",
      "bank",
    ])
  })
})

describe("DimensionPickerContent", () => {
  it("adds a dimension to the grouping when checked", async () => {
    const onGroupingChange = vi.fn()
    render(
      <DimensionPickerContent
        dimensions={dimensions}
        grouping={[]}
        onGroupingChange={onGroupingChange}
      />,
    )
    await userEvent.click(screen.getByRole("checkbox", { name: "Entity" }))
    expect(onGroupingChange).toHaveBeenCalledWith(["entity"])
  })

  it("removes a dimension from the grouping when unchecked", async () => {
    const onGroupingChange = vi.fn()
    render(
      <DimensionPickerContent
        dimensions={dimensions}
        grouping={["entity", "bank"]}
        onGroupingChange={onGroupingChange}
      />,
    )
    await userEvent.click(screen.getByRole("checkbox", { name: "Bank" }))
    expect(onGroupingChange).toHaveBeenCalledWith(["entity"])
  })

  it("toggles when the dimension label text is clicked (full-row hit target)", async () => {
    const onGroupingChange = vi.fn()
    render(
      <DimensionPickerContent
        dimensions={dimensions}
        grouping={[]}
        onGroupingChange={onGroupingChange}
      />,
    )
    await userEvent.click(screen.getByText("Entity"))
    expect(onGroupingChange).toHaveBeenCalledWith(["entity"])
  })

  it("renders selected dimensions as reorderable hierarchy items", () => {
    render(
      <DimensionPickerContent
        dimensions={dimensions}
        grouping={["entity", "bank"]}
        onGroupingChange={vi.fn()}
      />,
    )
    expect(screen.getByLabelText("Drag Entity")).toBeInTheDocument()
    expect(screen.getByLabelText("Drag Bank")).toBeInTheDocument()
  })
})
