import { describe, expect, it } from "vitest"
import type { Row } from "@tanstack/react-table"
import {
  deriveColumnVisibility,
  getGroupRowCount,
  normalizeGrouping,
} from "./grouping-utils"

// Minimal fake row. `getLeafRows()` mirrors TanStack: the flattened subtree may
// contain intermediate grouped rows alongside real data rows.
function fakeRow(opts: {
  immediate: number
  dataLeaves: number
  groupLeaves?: number
}): Row<unknown> {
  const leaves = [
    ...new Array(opts.dataLeaves)
      .fill(null)
      .map(() => ({ getIsGrouped: () => false })),
    ...new Array(opts.groupLeaves ?? 0)
      .fill(null)
      .map(() => ({ getIsGrouped: () => true })),
  ]
  return {
    subRows: new Array(opts.immediate).fill(null),
    getLeafRows: () => leaves,
  } as unknown as Row<unknown>
}

describe("getGroupRowCount", () => {
  it("defaults to counting only data leaf rows", () => {
    expect(getGroupRowCount(fakeRow({ immediate: 2, dataLeaves: 9 }))).toBe(9)
  })
  it("excludes intermediate grouped rows from the leaf count", () => {
    // e.g. an entity with 3 accounts spread across 2 bank sub-groups.
    expect(
      getGroupRowCount(
        fakeRow({ immediate: 2, dataLeaves: 3, groupLeaves: 2 }),
      ),
    ).toBe(3)
  })
  it("uses immediate sub-row count when countMode is 'immediate'", () => {
    expect(
      getGroupRowCount(fakeRow({ immediate: 2, dataLeaves: 9 }), "immediate"),
    ).toBe(2)
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
  it("returns an empty array for empty input", () => {
    expect(normalizeGrouping([], allowed)).toEqual([])
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
