import { describe, expect, it } from "vitest"
import type { CellContext } from "@tanstack/react-table"
import type { FieldType } from "./types"

// A minimal conforming field proves the contract shape compiles and works.
const stringField: FieldType<string> = {
  name: "test-string",
  icon: () => null,
  display: (ctx) => ctx.getValue(),
  toClipboard: (v) => v ?? "",
  fromClipboard: (t) => t,
}

describe("FieldType contract", () => {
  it("exposes name, display, and clipboard round-trip", () => {
    expect(stringField.name).toBe("test-string")
    expect(stringField.toClipboard("hi")).toBe("hi")
    expect(stringField.fromClipboard("hi")).toBe("hi")
    const ctx = { getValue: () => "value" } as unknown as CellContext<unknown, string>
    expect(stringField.display(ctx)).toBe("value")
  })
})
