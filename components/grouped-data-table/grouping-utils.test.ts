import { describe, expect, it } from "vitest"
import type { Row } from "@tanstack/react-table"
import {
  deriveColumnVisibility,
  getGroupRowCount,
  normalizeGrouping,
} from "./grouping-utils"

// Minimal fake row supporting the two count modes.
function fakeRow(immediate: number, leaf: number): Row<unknown> {
  return {
    subRows: new Array(immediate).fill(null),
    getLeafRows: () => new Array(leaf).fill(null),
  } as unknown as Row<unknown>
}

describe("getGroupRowCount", () => {
  it("defaults to leaf-descendant count", () => {
    expect(getGroupRowCount(fakeRow(2, 9))).toBe(9)
  })
  it("uses immediate sub-row count when countMode is 'immediate'", () => {
    expect(getGroupRowCount(fakeRow(2, 9), "immediate")).toBe(2)
  })
})

describe("normalizeGrouping", () => {
  const allowed = ["entity", "bank"]
  it("keeps only allowed ids, preserving order", () => {
    expect(normalizeGrouping(["bank", "entity"], allowed)).toEqual([
      "bank",
      "entity",
    ])
  })
  it("drops ids not in the allowed list", () => {
    expect(normalizeGrouping(["bank", "ghost"], allowed)).toEqual(["bank"])
  })
  it("dedupes repeated ids", () => {
    expect(normalizeGrouping(["bank", "bank"], allowed)).toEqual(["bank"])
  })
})

describe("deriveColumnVisibility", () => {
  it("hides every currently-grouped dimension column", () => {
    expect(deriveColumnVisibility(["entity"])).toEqual({ entity: false })
  })
  it("returns an empty map when nothing is grouped", () => {
    expect(deriveColumnVisibility([])).toEqual({})
  })
})
