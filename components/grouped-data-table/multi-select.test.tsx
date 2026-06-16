import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { MultiSelectContent, multiSelectLabel } from "./multi-select"

const options = [
  { label: "HSBC", value: "HSBC" },
  { label: "Citi", value: "Citi" },
]

describe("multiSelectLabel", () => {
  it("shows placeholder when empty and a count otherwise", () => {
    expect(multiSelectLabel([], "Select…")).toBe("Select…")
    expect(multiSelectLabel(["HSBC"], "Select…")).toBe("1 selected")
    expect(multiSelectLabel(["HSBC", "Citi"], "Select…")).toBe("2 selected")
  })
})

describe("MultiSelectContent", () => {
  it("adds a value when its checkbox is toggled on", async () => {
    const onChange = vi.fn()
    render(<MultiSelectContent options={options} selected={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole("checkbox", { name: "HSBC" }))
    expect(onChange).toHaveBeenCalledWith(["HSBC"])
  })
  it("removes a value when its checkbox is toggled off", async () => {
    const onChange = vi.fn()
    render(<MultiSelectContent options={options} selected={["HSBC", "Citi"]} onChange={onChange} />)
    await userEvent.click(screen.getByRole("checkbox", { name: "Citi" }))
    expect(onChange).toHaveBeenCalledWith(["HSBC"])
  })
})
