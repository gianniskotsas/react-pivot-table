import { describe, expect, it } from "vitest"

import { AGGREGATION_METHOD_LABELS, ALL_AGGREGATION_METHODS, aggregate } from "./aggregate"

describe("aggregate", () => {
  it("sums values", () => {
    expect(aggregate("sum", [1, 2, 3])).toBe(6)
  })

  it("averages values", () => {
    expect(aggregate("avg", [2, 4, 6])).toBe(4)
  })

  it("finds min and max", () => {
    expect(aggregate("min", [5, 1, 9])).toBe(1)
    expect(aggregate("max", [5, 1, 9])).toBe(9)
  })

  it("counts values, including blanks", () => {
    expect(aggregate("count", [1, 2, 3])).toBe(3)
    expect(aggregate("count", [1, null, undefined])).toBe(3)
    expect(aggregate("count", [])).toBe(0)
  })

  it("ignores null/undefined/NaN for sum/avg/min/max", () => {
    expect(aggregate("sum", [1, null, 2, undefined, Number.NaN, 3])).toBe(6)
    expect(aggregate("avg", [10, null, 20])).toBe(15)
    expect(aggregate("min", [null, 5, undefined, 2])).toBe(2)
    expect(aggregate("max", [null, 5, undefined, 2])).toBe(5)
  })

  it("returns 0 for sum of an empty/all-blank input, NaN for avg/min/max", () => {
    expect(aggregate("sum", [])).toBe(0)
    expect(aggregate("sum", [null, undefined])).toBe(0)
    expect(aggregate("avg", [])).toBeNaN()
    expect(aggregate("min", [])).toBeNaN()
    expect(aggregate("max", [])).toBeNaN()
  })

  it("exposes labels and an ordered method list for the picker UI", () => {
    expect(AGGREGATION_METHOD_LABELS.sum).toBe("Sum")
    expect(AGGREGATION_METHOD_LABELS.avg).toBe("Average")
    expect(AGGREGATION_METHOD_LABELS.min).toBe("Min")
    expect(AGGREGATION_METHOD_LABELS.max).toBe("Max")
    expect(AGGREGATION_METHOD_LABELS.count).toBe("Count")
    expect(ALL_AGGREGATION_METHODS).toEqual(["sum", "avg", "min", "max", "count"])
  })
})
