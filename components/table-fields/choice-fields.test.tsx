import { fireEvent, render, screen } from "@testing-library/react"
import type { CellContext } from "@tanstack/react-table"
import { describe, expect, it, vi } from "vitest"
import { checkboxField, multiSelectField, singleSelectField } from "./choice-fields"

const OPTS = [
  { label: "Sales", value: "sales" },
  { label: "Engineering", value: "eng" },
]
function ctx<V>(value: V): CellContext<unknown, V> {
  return { getValue: () => value } as unknown as CellContext<unknown, V>
}

describe("choice fields", () => {
  it("singleSelectField shows the option label", () => {
    const f = singleSelectField({ options: OPTS })
    const { container } = render(<>{f.display(ctx("eng"))}</>)
    expect(container.textContent).toBe("Engineering")
    expect(f.toClipboard("eng")).toBe("eng")
    expect(f.fromClipboard("eng")).toBe("eng")
  })

  it("multiSelectField shows all selected labels and joins clipboard", () => {
    const f = multiSelectField({ options: OPTS })
    const { container } = render(<>{f.display(ctx(["sales", "eng"]))}</>)
    expect(container.textContent).toContain("Sales")
    expect(container.textContent).toContain("Engineering")
    expect(f.toClipboard(["sales", "eng"])).toBe("sales, eng")
    expect(f.fromClipboard("sales, eng")).toEqual(["sales", "eng"])
  })

  it("checkboxField shows True/False pills and clipboard booleans", () => {
    const f = checkboxField()
    const { container: on } = render(<>{f.display(ctx(true))}</>)
    expect(on.textContent).toBe("True")
    const { container: off } = render(<>{f.display(ctx(false))}</>)
    expect(off.textContent).toBe("False")
    expect(f.toClipboard(true)).toBe("true")
    expect(f.fromClipboard("true")).toBe(true)
    expect(f.fromClipboard("false")).toBe(false)
  })
})

describe("choice field edit renderers", () => {
  it("singleSelectField.edit renders a native select and commits on change", () => {
    const setValue = vi.fn()
    const commit = vi.fn()
    render(
      <>
        {singleSelectField({ options: OPTS }).edit!({
          value: "sales",
          setValue,
          commit,
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    const select = screen.getByRole("combobox")
    expect(select).toHaveValue("sales")
    fireEvent.change(select, { target: { value: "eng" } })
    expect(setValue).toHaveBeenCalledWith("eng")
    expect(commit).toHaveBeenCalled()
  })

  it("checkboxField.edit renders a Checkbox and commits on toggle", () => {
    const setValue = vi.fn()
    const commit = vi.fn()
    render(
      <>
        {checkboxField().edit!({
          value: false,
          setValue,
          commit,
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    fireEvent.click(screen.getByRole("checkbox"))
    expect(setValue).toHaveBeenCalledWith(true)
    expect(commit).toHaveBeenCalled()
  })

  it("checkboxField.edit forwards Tab to focusNext and Escape to cancel", () => {
    const cancel = vi.fn()
    const focusNext = vi.fn()
    render(
      <>
        {checkboxField().edit!({
          value: false,
          setValue: vi.fn(),
          commit: vi.fn(),
          cancel,
          focusNext,
        })}
      </>,
    )
    const checkbox = screen.getByRole("checkbox")
    fireEvent.keyDown(checkbox, { key: "Tab" })
    expect(focusNext).toHaveBeenCalledWith("next")
    fireEvent.keyDown(checkbox, { key: "Escape" })
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it("singleSelectField.edit cancels on Escape and commits+advances on Tab", () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const focusNext = vi.fn()
    render(
      <>
        {singleSelectField({ options: OPTS }).edit!({
          value: "sales",
          setValue: vi.fn(),
          commit,
          cancel,
          focusNext,
        })}
      </>,
    )
    const select = screen.getByRole("combobox")
    fireEvent.keyDown(select, { key: "Escape" })
    expect(cancel).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(select, { key: "Tab" })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(focusNext).toHaveBeenCalledWith("next")
  })

  it("multiSelectField has no edit renderer (deferred)", () => {
    expect(multiSelectField({ options: OPTS }).edit).toBeUndefined()
  })
})
