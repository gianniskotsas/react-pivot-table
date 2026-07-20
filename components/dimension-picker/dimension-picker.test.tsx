import { render, screen } from "@testing-library/react"
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
  it("shows the selected dimension count in the multi-select trigger", () => {
    render(
      <DimensionPickerContent
        dimensions={dimensions}
        grouping={["entity", "bank"]}
        onGroupingChange={vi.fn()}
      />,
    )
    // Collapsed multi-select dropdown shows "N selected" (its checkbox list is
    // in a portal; the add/remove toggle behavior is covered in multi-select.test).
    expect(
      screen.getByRole("button", { name: "Dimensions" }),
    ).toHaveTextContent("2 selected")
  })

  it("shows the placeholder when no dimensions are selected", () => {
    render(
      <DimensionPickerContent
        dimensions={dimensions}
        grouping={[]}
        onGroupingChange={vi.fn()}
      />,
    )
    expect(
      screen.getByRole("button", { name: "Dimensions" }),
    ).toHaveTextContent("Select dimensions…")
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
