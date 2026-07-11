import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Popover, PopoverContent } from "@/components/ui/popover"
import { PopoverButtonTrigger } from "./primitives"

describe("PopoverButtonTrigger", () => {
  it("renders a labeled button trigger with its children", () => {
    render(
      <Popover>
        <PopoverButtonTrigger ariaLabel="Open menu">Columns</PopoverButtonTrigger>
        <PopoverContent>hidden</PopoverContent>
      </Popover>,
    )
    const trigger = screen.getByLabelText("Open menu")
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent("Columns")
  })

  it("is findable by its text content when ariaLabel is omitted (the real ColumnsMenu usage)", () => {
    render(
      <Popover>
        <PopoverButtonTrigger className="gap-2">Columns</PopoverButtonTrigger>
        <PopoverContent>hidden</PopoverContent>
      </Popover>,
    )
    expect(screen.getByRole("button", { name: "Columns" })).toBeInTheDocument()
  })
})
