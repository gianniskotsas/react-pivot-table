import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChipCell } from "./chip"

describe("ChipCell", () => {
  const writeText = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    writeText.mockClear()
    Object.assign(navigator, { clipboard: { writeText } })
  })

  it("renders the label and copies copyValue on the copy button click", () => {
    render(<ChipCell label="hello" copyValue="hello@x.com" />)
    expect(screen.getByText("hello")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /copy/i }))
    expect(writeText).toHaveBeenCalledWith("hello@x.com")
  })

  it("renders as a link when href is provided", () => {
    render(<ChipCell label="site" href="https://x.com" copyValue="https://x.com" />)
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://x.com")
  })
})
