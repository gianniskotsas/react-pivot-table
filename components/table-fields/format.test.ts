import { describe, expect, it } from "vitest"
import { formatCurrency, formatDuration, formatNumber, formatPercent } from "./format"

describe("formatNumber", () => {
  it("formats with grouping and default 2 fraction digits", () => {
    expect(formatNumber(1234.5)).toBe("1,234.5")
  })
  it("returns empty string for null/NaN", () => {
    expect(formatNumber(NaN)).toBe("")
    expect(formatNumber(null as unknown as number)).toBe("")
  })
})

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(1000)).toBe("$1,000.00")
  })
  it("honors the currency option", () => {
    expect(formatCurrency(1000, { currency: "EUR" })).toBe("€1,000.00")
  })
})

describe("formatPercent", () => {
  it("treats the value as a fraction of 1", () => {
    expect(formatPercent(0.75)).toBe("75%")
  })
})

describe("formatDuration", () => {
  it("defaults to minutes as m:ss", () => {
    expect(formatDuration(90)).toBe("1:30")
    expect(formatDuration(5)).toBe("0:05")
  })
  it("supports h:mm:ss with the hms unit", () => {
    expect(formatDuration(3661, { unit: "hms" })).toBe("1:01:01")
  })
})
