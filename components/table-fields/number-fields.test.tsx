import { fireEvent, render, screen } from "@testing-library/react"
import type { CellContext } from "@tanstack/react-table"
import { describe, expect, it, vi } from "vitest"
import {
  currencyField,
  durationField,
  numberField,
  percentField,
} from "./number-fields"

function ctx(value: number): CellContext<unknown, number> {
  return { getValue: () => value } as unknown as CellContext<unknown, number>
}

describe("number fields", () => {
  it("numberField displays grouped number, right-aligned, Hash icon", () => {
    const f = numberField()
    expect(f.name).toBe("number")
    expect(f.align).toBe("right")
    const { container } = render(<>{f.display(ctx(1234.5))}</>)
    expect(container.textContent).toBe("1,234.5")
  })

  it("currencyField displays currency and round-trips clipboard", () => {
    const f = currencyField({ currency: "USD" })
    const { container } = render(<>{f.display(ctx(1000))}</>)
    expect(container.textContent).toBe("$1,000.00")
    expect(f.toClipboard(1000)).toBe("1000")
    expect(f.fromClipboard("$1,000.00")).toBe(1000)
    expect(f.fromClipboard("nope")).toBeUndefined()
  })

  it("percentField displays a percent", () => {
    const { container } = render(<>{percentField().display(ctx(0.75))}</>)
    expect(container.textContent).toBe("75%")
  })

  it("durationField displays a humanized duration", () => {
    const { container } = render(<>{durationField().display(ctx(5400))}</>)
    expect(container.textContent).toBe("1h 30m")
  })
})

describe("number field edit renderers", () => {
  it("numberField.edit renders a number input wired to the edit context", () => {
    const setValue = vi.fn()
    const commit = vi.fn()
    render(
      <>
        {numberField().edit!({
          value: 5,
          setValue,
          commit,
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    const input = screen.getByRole("spinbutton")
    expect(input).toHaveValue(5)
    fireEvent.change(input, { target: { value: "9" } })
    expect(setValue).toHaveBeenCalledWith(9)
    fireEvent.blur(input)
    expect(commit).toHaveBeenCalled()
  })

  it("numberField.edit commits and moves down on Enter, cancels on Escape", () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const focusNext = vi.fn()
    render(
      <>
        {numberField().edit!({
          value: 5,
          setValue: vi.fn(),
          commit,
          cancel,
          focusNext,
        })}
      </>,
    )
    const input = screen.getByRole("spinbutton")
    fireEvent.keyDown(input, { key: "Enter" })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(focusNext).toHaveBeenCalledWith("down")
    fireEvent.keyDown(input, { key: "Escape" })
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it("currencyField/percentField/durationField all expose an edit renderer", () => {
    expect(currencyField().edit).toBeTypeOf("function")
    expect(percentField().edit).toBeTypeOf("function")
    expect(durationField().edit).toBeTypeOf("function")
  })

  it("a fully-typed negative value commits correctly (onChange only ever sees '' or a parseable number)", () => {
    const setValue = vi.fn()
    render(
      <>
        {currencyField().edit!({
          value: 100,
          setValue,
          commit: vi.fn(),
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    const input = screen.getByRole("spinbutton")
    fireEvent.change(input, { target: { value: "-5" } })
    expect(setValue).toHaveBeenCalledWith(-5)
  })
})
