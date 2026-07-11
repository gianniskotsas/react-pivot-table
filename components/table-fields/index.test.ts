import { describe, expect, it } from "vitest"
import * as fields from "./index"

describe("table-fields barrel", () => {
  it("re-exports every field factory and standalone cell", () => {
    for (const name of [
      "numberField", "currencyField", "percentField", "durationField",
      "textField", "longTextField", "urlField", "emailField", "phoneField",
      "singleSelectField", "multiSelectField", "checkboxField",
      "ratingField", "buttonField", "dateField",
      "currencyCell", "urlCell", "singleSelectCell", "ratingCell",
      "formatCurrency", "FIELD_ICONS",
    ]) {
      expect(fields).toHaveProperty(name)
    }
  })
})
