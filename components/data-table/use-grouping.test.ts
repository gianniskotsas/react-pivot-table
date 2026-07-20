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
})
