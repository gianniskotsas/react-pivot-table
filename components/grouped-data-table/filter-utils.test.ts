import { describe, expect, it } from "vitest"
import type { FilterCondition, FilterDef } from "./types"
import {
  conditionsToColumnFilters,
  createCondition,
  defaultOperatorsFor,
  describeCondition,
  evaluateCondition,
  normalizeConditions,
  operatorsForDef,
  removeCondition,
  replaceCondition,
  withColumn,
  withOperator,
  withValue,
} from "./filter-utils"

const defs: FilterDef[] = [
  { id: "bank", label: "Bank", type: "select", options: [
    { label: "HSBC", value: "HSBC" }, { label: "Citi", value: "Citi" },
  ] },
  { id: "balance", label: "Balance", type: "number" },
]

describe("defaultOperatorsFor / operatorsForDef", () => {
  it("returns the default operator set per type", () => {
    expect(defaultOperatorsFor("text")).toEqual(["contains", "equals", "startsWith"])
    expect(defaultOperatorsFor("number")).toEqual(["eq", "ne", "gt", "lt", "between"])
    expect(defaultOperatorsFor("select")).toEqual(["is", "isAnyOf"])
    expect(defaultOperatorsFor("date")).toEqual(["before", "after", "dateBetween"])
  })
  it("prefers explicit operators on the def", () => {
    expect(operatorsForDef({ id: "x", label: "X", type: "number", operators: ["gt"] })).toEqual(["gt"])
  })
})

describe("evaluateCondition", () => {
  it("treats empty/null value as no constraint", () => {
    expect(evaluateCondition("anything", "contains", null)).toBe(true)
    expect(evaluateCondition(5, "gt", "")).toBe(true)
    expect(evaluateCondition("x", "isAnyOf", [])).toBe(true)
  })
  it("text contains/equals/startsWith are case-insensitive", () => {
    expect(evaluateCondition("HSBC Bank", "contains", "hsbc")).toBe(true)
    expect(evaluateCondition("HSBC", "equals", "hsbc")).toBe(true)
    expect(evaluateCondition("HSBC", "startsWith", "hs")).toBe(true)
    expect(evaluateCondition("Citi", "contains", "hsbc")).toBe(false)
  })
  it("number operators", () => {
    expect(evaluateCondition(10, "eq", 10)).toBe(true)
    expect(evaluateCondition(10, "ne", 11)).toBe(true)
    expect(evaluateCondition(10, "gt", 5)).toBe(true)
    expect(evaluateCondition(10, "lt", 5)).toBe(false)
    expect(evaluateCondition(10, "between", [5, 15])).toBe(true)
    expect(evaluateCondition(20, "between", [5, 15])).toBe(false)
  })
  it("select is / isAnyOf", () => {
    expect(evaluateCondition("HSBC", "is", "HSBC")).toBe(true)
    expect(evaluateCondition("HSBC", "isAnyOf", ["HSBC", "Citi"])).toBe(true)
    expect(evaluateCondition("ING", "isAnyOf", ["HSBC", "Citi"])).toBe(false)
  })
  it("date before/after/dateBetween", () => {
    expect(evaluateCondition("2024-01-01", "before", "2024-06-01")).toBe(true)
    expect(evaluateCondition("2024-12-01", "after", "2024-06-01")).toBe(true)
    expect(evaluateCondition("2024-03-01", "dateBetween", ["2024-01-01", "2024-06-01"])).toBe(true)
  })
})

describe("conditionsToColumnFilters", () => {
  it("groups conditions by columnId", () => {
    const conds: FilterCondition[] = [
      { id: "a", columnId: "bank", operator: "is", value: "HSBC" },
      { id: "b", columnId: "balance", operator: "gt", value: 100 },
      { id: "c", columnId: "bank", operator: "isAnyOf", value: ["HSBC"] },
    ]
    const result = conditionsToColumnFilters(conds)
    expect(result).toEqual([
      { id: "bank", value: [conds[0], conds[2]] },
      { id: "balance", value: [conds[1]] },
    ])
  })
})

describe("describeCondition", () => {
  it("uses label, operator symbol, and value", () => {
    expect(
      describeCondition({ id: "a", columnId: "balance", operator: "gt", value: 100 }, defs[1]),
    ).toBe("Balance > 100")
  })
  it("maps select values to option labels and joins isAnyOf", () => {
    expect(
      describeCondition(
        { id: "a", columnId: "bank", operator: "isAnyOf", value: ["HSBC", "Citi"] },
        defs[0],
      ),
    ).toBe("Bank is any of HSBC, Citi")
  })
})

describe("mutation helpers", () => {
  it("createCondition defaults to first def + its first operator + null value", () => {
    expect(createCondition(defs, "id1")).toEqual({
      id: "id1", columnId: "bank", operator: "is", value: null,
    })
  })
  it("withColumn resets operator and value", () => {
    const c: FilterCondition = { id: "x", columnId: "bank", operator: "isAnyOf", value: ["HSBC"] }
    expect(withColumn(c, "balance", defs)).toEqual({
      id: "x", columnId: "balance", operator: "eq", value: null,
    })
  })
  it("withOperator resets value", () => {
    const c: FilterCondition = { id: "x", columnId: "balance", operator: "eq", value: 5 }
    expect(withOperator(c, "between")).toEqual({
      id: "x", columnId: "balance", operator: "between", value: null,
    })
  })
  it("withValue sets value", () => {
    const c: FilterCondition = { id: "x", columnId: "balance", operator: "eq", value: null }
    expect(withValue(c, 42)).toEqual({ id: "x", columnId: "balance", operator: "eq", value: 42 })
  })
  it("removeCondition and replaceCondition", () => {
    const list: FilterCondition[] = [
      { id: "a", columnId: "bank", operator: "is", value: "HSBC" },
      { id: "b", columnId: "balance", operator: "gt", value: 1 },
    ]
    expect(removeCondition(list, "a")).toEqual([list[1]])
    const updated = { ...list[0], value: "Citi" }
    expect(replaceCondition(list, updated)).toEqual([updated, list[1]])
  })
  it("normalizeConditions drops unknown columns", () => {
    const list: FilterCondition[] = [
      { id: "a", columnId: "bank", operator: "is", value: "HSBC" },
      { id: "b", columnId: "ghost", operator: "is", value: "x" },
    ]
    expect(normalizeConditions(list, ["bank", "balance"])).toEqual([list[0]])
  })
})
