import { describe, expect, it } from "vitest"
import { FIELD_ICONS } from "./icons"

describe("FIELD_ICONS", () => {
  it("maps every Release-1 field name to an icon component", () => {
    const names = [
      "number", "currency", "percent", "duration",
      "text", "longText", "url", "email", "phone",
      "singleSelect", "multiSelect", "checkbox",
      "rating", "button", "date",
    ]
    for (const name of names) {
      expect(typeof FIELD_ICONS[name as keyof typeof FIELD_ICONS]).toBe("object") // lucide icons are forwardRef objects
    }
  })
})
