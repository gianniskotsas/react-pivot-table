import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useGrouping } from "./use-grouping"

const CONFIG = {
  dimensions: [
    { id: "stage", label: "Stage" },
    { id: "owner", label: "Owner" },
  ],
  initial: ["stage"],
  column: { header: "Deal" },
}

describe("useGrouping", () => {
  it("is disabled and inert when no config is supplied", () => {
    const { result } = renderHook(() => useGrouping(undefined))
    expect(result.current.enabled).toBe(false)
    expect(result.current.grouping).toEqual([])
    expect(result.current.derivedVisibility).toEqual({})
  })

  it("seeds grouping from `initial` at mount", () => {
    const { result } = renderHook(() => useGrouping(CONFIG))
    expect(result.current.enabled).toBe(true)
    expect(result.current.grouping).toEqual(["stage"])
  })

  it("drops ids that are not declared dimensions", () => {
    const { result } = renderHook(() =>
      useGrouping({ ...CONFIG, initial: ["stage", "not-a-dimension"] }),
    )
    expect(result.current.grouping).toEqual(["stage"])
  })

  it("normalizes on setGrouping too", () => {
    const { result } = renderHook(() => useGrouping(CONFIG))
    act(() => result.current.setGrouping(["owner", "bogus", "stage"]))
    expect(result.current.grouping).toEqual(["owner", "stage"])
  })

  it("hides grouped dimension columns via derivedVisibility", () => {
    const { result } = renderHook(() => useGrouping(CONFIG))
    expect(result.current.derivedVisibility).toEqual({ stage: false })
  })

  it("keeps setGrouping and derivedVisibility referentially stable across renders when a fresh config literal (same dimension ids) is passed each time", () => {
    const { result, rerender } = renderHook(
      () =>
        useGrouping({
          // Fresh object literal every render, mirroring real consumers who
          // write `grouping={{ ... }}` inline. Only identity differs; the
          // dimension ids are the same each time.
          dimensions: [
            { id: "stage", label: "Stage" },
            { id: "owner", label: "Owner" },
          ],
          initial: ["stage"],
          column: { header: "Deal" },
        }),
      { initialProps: undefined },
    )

    const firstSetGrouping = result.current.setGrouping
    const firstDerivedVisibility = result.current.derivedVisibility

    rerender()
    rerender()
    rerender()

    expect(Object.is(result.current.setGrouping, firstSetGrouping)).toBe(true)
    expect(
      Object.is(result.current.derivedVisibility, firstDerivedVisibility),
    ).toBe(true)
  })

  it("does not corrupt allowedIds when a dimension id contains the join delimiter (space)", () => {
    const { result } = renderHook(() =>
      useGrouping({
        dimensions: [
          { id: "a b", label: "A B" },
          { id: "c", label: "C" },
        ],
        initial: [],
        column: { header: "Deal" },
      }),
    )

    // "a" was never declared as a dimension id (only "a b" and "c" were), so
    // a naive join(" ")/split(" ") round-trip would wrongly accept it.
    act(() => result.current.setGrouping(["a", "a b", "c"]))
    expect(result.current.grouping).toEqual(["a b", "c"])
  })

  it("starts expanded as {} and updates via setExpanded", () => {
    const { result } = renderHook(() => useGrouping(CONFIG))
    expect(result.current.expanded).toEqual({})

    act(() => result.current.setExpanded({ stage: true }))
    expect(result.current.expanded).toEqual({ stage: true })
  })
})
