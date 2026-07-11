import { render } from "@testing-library/react"
import type { CellContext } from "@tanstack/react-table"
import { describe, expect, it } from "vitest"
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
