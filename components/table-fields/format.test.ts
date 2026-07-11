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
  it("humanizes seconds into the two most-significant units", () => {
    expect(formatDuration(90)).toBe("1m 30s")
    expect(formatDuration(5)).toBe("5s")
    expect(formatDuration(5400)).toBe("1h 30m")
    expect(formatDuration(90000)).toBe("1d 1h")
    expect(formatDuration(0)).toBe("0s")
  })
  it("accepts a millisecond input unit", () => {
    expect(formatDuration(1500, { unit: "ms" })).toBe("1s 500ms")
  })
  it("returns empty string for blank input", () => {
    expect(formatDuration(NaN)).toBe("")
  })
})
