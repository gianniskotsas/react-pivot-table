import { fireEvent, render, screen } from "@testing-library/react"
import type { CellContext } from "@tanstack/react-table"
import { describe, expect, it, vi } from "vitest"
import { buttonField, dateField, ratingField } from "./widget-fields"

function ctx<V>(value: V, original: unknown = {}): CellContext<unknown, V> {
  return { getValue: () => value, row: { original } } as unknown as CellContext<unknown, V>
}

describe("widget fields", () => {
  it("ratingField renders max stars with N filled", () => {
    const { container } = render(<>{ratingField({ max: 5 }).display(ctx(3))}</>)
    expect(container.querySelectorAll('[data-star]')).toHaveLength(5)
    expect(container.querySelectorAll('[data-star="filled"]')).toHaveLength(3)
  })

  it("ratingField clamps pasted values to [0, max]", () => {
    const f = ratingField({ max: 5 })
    expect(f.fromClipboard("999")).toBe(5)
    expect(f.fromClipboard("-3")).toBe(0)
    expect(f.fromClipboard("abc")).toBeUndefined()
  })

  it("buttonField renders a button that calls onClick with the row", () => {
    const onClick = vi.fn()
    render(<>{buttonField({ label: "Open", onClick }).display(ctx(null, { id: "r1" }))}</>)
    fireEvent.click(screen.getByRole("button", { name: "Open" }))
    expect(onClick).toHaveBeenCalledWith({ id: "r1" })
  })

  it("dateField displays a locale date and round-trips ISO", () => {
    const f = dateField()
    const { container } = render(<>{f.display(ctx("2026-07-11"))}</>)
    // UTC-pinned, so this is the same calendar day in every timezone (guards
    // the off-by-one where a UTC-midnight date renders as the previous day).
    expect(container.textContent).toBe("Jul 11, 2026")
    expect(f.toClipboard("2026-07-11")).toBe("2026-07-11")
    expect(f.fromClipboard("2026-07-11")).toBe("2026-07-11")
  })
})

describe("widget field edit renderers", () => {
  it("ratingField.edit renders clickable stars that set and commit", () => {
    const setValue = vi.fn()
    const commit = vi.fn()
    const { container } = render(
      <>
        {ratingField({ max: 5 }).edit!({
          value: 2,
          setValue,
          commit,
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    const stars = container.querySelectorAll("button[aria-label]")
    expect(stars).toHaveLength(5)
    fireEvent.click(stars[3]) // 4th star -> rating 4
    expect(setValue).toHaveBeenCalledWith(4)
    expect(commit).toHaveBeenCalled()
  })

  it("ratingField.edit forwards Tab to focusNext and Escape to cancel", () => {
    const cancel = vi.fn()
    const focusNext = vi.fn()
    const { container } = render(
      <>
        {ratingField({ max: 5 }).edit!({
          value: 2,
          setValue: vi.fn(),
          commit: vi.fn(),
          cancel,
          focusNext,
        })}
      </>,
    )
    const wrapper = container.firstElementChild!
    fireEvent.keyDown(wrapper, { key: "Tab" })
    expect(focusNext).toHaveBeenCalledWith("next")
    fireEvent.keyDown(wrapper, { key: "Escape" })
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it("dateField.edit renders a native date input seeded with the ISO date", () => {
    const setValue = vi.fn()
    render(
      <>
        {dateField().edit!({
          value: "2026-07-11",
          setValue,
          commit: vi.fn(),
          cancel: vi.fn(),
          focusNext: vi.fn(),
        })}
      </>,
    )
    const input = screen.getByDisplayValue("2026-07-11")
    expect(input).toHaveAttribute("type", "date")
    fireEvent.change(input, { target: { value: "2026-08-01" } })
    expect(setValue).toHaveBeenCalledWith("2026-08-01")
  })

  it("dateField.edit commits and moves down on Enter, cancels on Escape", () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const focusNext = vi.fn()
    render(
      <>
        {dateField().edit!({
          value: "2026-07-11",
          setValue: vi.fn(),
          commit,
          cancel,
          focusNext,
        })}
      </>,
    )
    const input = screen.getByDisplayValue("2026-07-11")
    fireEvent.keyDown(input, { key: "Enter" })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(focusNext).toHaveBeenCalledWith("down")
    fireEvent.keyDown(input, { key: "Escape" })
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it("dateField.edit commits and advances on Tab", () => {
    const commit = vi.fn()
    const focusNext = vi.fn()
    render(
      <>
        {dateField().edit!({
          value: "2026-07-11",
          setValue: vi.fn(),
          commit,
          cancel: vi.fn(),
          focusNext,
        })}
      </>,
    )
    const input = screen.getByDisplayValue("2026-07-11")
    fireEvent.keyDown(input, { key: "Tab" })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(focusNext).toHaveBeenCalledWith("next")
  })

  it("buttonField has no edit renderer", () => {
    expect(buttonField({ label: "x", onClick: () => {} }).edit).toBeUndefined()
  })
})
