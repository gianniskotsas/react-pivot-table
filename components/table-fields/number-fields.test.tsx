import { render } from "@testing-library/react"
import type { CellContext } from "@tanstack/react-table"
import { describe, expect, it } from "vitest"
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

  it("durationField displays minutes by default", () => {
    const { container } = render(<>{durationField().display(ctx(90))}</>)
    expect(container.textContent).toBe("1:30")
  })
})
