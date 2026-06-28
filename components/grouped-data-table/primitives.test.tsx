import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Popover, PopoverContent } from "@/components/ui/popover"
import { FieldSelect, PopoverButtonTrigger } from "./primitives"

describe("FieldSelect", () => {
  it("renders a trigger with the given accessible name", () => {
    render(
      <FieldSelect
        ariaLabel="Pick fruit"
        value="apple"
        items={[
          { value: "apple", label: "Apple" },
          { value: "banana", label: "Banana" },
        ]}
        onValueChange={vi.fn()}
      />,
    )
    expect(screen.getByLabelText("Pick fruit")).toBeInTheDocument()
  })
})

describe("PopoverButtonTrigger", () => {
  it("renders a labeled button trigger with its children", () => {
    render(
      <Popover>
        <PopoverButtonTrigger ariaLabel="Open menu">Group by</PopoverButtonTrigger>
        <PopoverContent>hidden</PopoverContent>
      </Popover>,
    )
    const trigger = screen.getByLabelText("Open menu")
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent("Group by")
  })
})
