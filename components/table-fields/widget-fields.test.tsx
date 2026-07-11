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
