import { describe, expect, it } from "vitest"
import type { FilterCondition, FilterDef, FilterGroup, FilterState } from "./types"
import type { Row } from "@tanstack/react-table"
import {
  addConditionToGroup,
  addGroup,
  conditionsToColumnFilters,
  countActiveConditions,
  createCondition,
  defaultOperatorsFor,
  describeCondition,
  emptyFilterState,
  evaluateCondition,
  evaluateFilterState,
  evaluateGroup,
  isConditionComplete,
  makeFilterFn,
  newGroup,
  normalizeConditions,
  normalizeFilterState,
  operatorsForDef,
  removeCondition,
  removeConditionFromGroup,
  removeGroup,
  replaceCondition,
  setGroupCombinator,
  setTopCombinator,
  updateConditionInGroup,
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
    expect(defaultOperatorsFor("text")).toEqual(["contains", "doesNotContain", "equals", "isNot", "startsWith"])
    expect(defaultOperatorsFor("number")).toEqual(["eq", "ne", "gt", "lt", "between"])
    expect(defaultOperatorsFor("select")).toEqual(["isAnyOf", "isNoneOf", "is"])
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
  it("between is inclusive on both bounds", () => {
    expect(evaluateCondition(5, "between", [5, 15])).toBe(true)
    expect(evaluateCondition(15, "between", [5, 15])).toBe(true)
  })
  it("between/dateBetween treat a non-array (mid-build) value as no constraint", () => {
    expect(evaluateCondition(10, "between", 5)).toBe(true)
    expect(evaluateCondition("2024-03-01", "dateBetween", "2024-01-01")).toBe(true)
  })
  it("between/dateBetween treat a half-built pair (one bound blank) as no constraint", () => {
    expect(evaluateCondition(10, "between", ["5", ""])).toBe(true)
    expect(evaluateCondition(10, "between", ["", "15"])).toBe(true)
    expect(evaluateCondition("2024-03-01", "dateBetween", ["2024-01-01", ""])).toBe(true)
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
    ).toBe("Balance greater than 100")
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
      id: "id1", columnId: "bank", operator: "isAnyOf", value: null,
    })
  })
  it("createCondition throws a clear error on empty filterDefs", () => {
    expect(() => createCondition([], "id1")).toThrow(/must not be empty/)
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

describe("makeFilterFn", () => {
  const fn = makeFilterFn<{ bank: string }>()
  const rowWith = (bank: string) =>
    ({ getValue: () => bank }) as unknown as Row<{ bank: string }>
  const noop = () => {}

  it("ANDs all conditions for the column and passes when none", () => {
    expect(fn(rowWith("HSBC"), "bank", [], noop)).toBe(true)
    expect(
      fn(
        rowWith("HSBC"),
        "bank",
        [
          { id: "1", columnId: "bank", operator: "contains", value: "HS" },
          { id: "2", columnId: "bank", operator: "startsWith", value: "H" },
        ],
        noop,
      ),
    ).toBe(true)
    expect(
      fn(
        rowWith("Citi"),
        "bank",
        [{ id: "1", columnId: "bank", operator: "contains", value: "HS" }],
        noop,
      ),
    ).toBe(false)
  })
})

describe("new operators", () => {
  it("doesNotContain / isNot / isNoneOf", () => {
    expect(evaluateCondition("HSBC", "doesNotContain", "citi")).toBe(true)
    expect(evaluateCondition("HSBC", "doesNotContain", "hs")).toBe(false)
    expect(evaluateCondition("HSBC", "isNot", "Citi")).toBe(true)
    expect(evaluateCondition("HSBC", "isNot", "hsbc")).toBe(false)
    expect(evaluateCondition("ING", "isNoneOf", ["HSBC", "Citi"])).toBe(true)
    expect(evaluateCondition("HSBC", "isNoneOf", ["HSBC", "Citi"])).toBe(false)
    expect(evaluateCondition("x", "doesNotContain", "")).toBe(true)
    expect(evaluateCondition("x", "isNoneOf", [])).toBe(true)
  })
})

const get = (row: Record<string, unknown>) => (columnId: string): unknown => row[columnId]

describe("evaluateGroup", () => {
  const group = (combinator: "and" | "or"): FilterGroup => ({
    id: "g1", combinator,
    conditions: [
      { id: "a", columnId: "bank", operator: "is", value: "HSBC" },
      { id: "b", columnId: "balance", operator: "gt", value: 100 },
    ],
  })
  it("AND requires all", () => {
    expect(evaluateGroup(group("and"), get({ bank: "HSBC", balance: 200 }))).toBe(true)
    expect(evaluateGroup(group("and"), get({ bank: "HSBC", balance: 10 }))).toBe(false)
  })
  it("OR requires any", () => {
    expect(evaluateGroup(group("or"), get({ bank: "Citi", balance: 200 }))).toBe(true)
    expect(evaluateGroup(group("or"), get({ bank: "Citi", balance: 10 }))).toBe(false)
  })
  it("incomplete-only group is no constraint", () => {
    const g: FilterGroup = { id: "g", combinator: "and", conditions: [
      { id: "a", columnId: "bank", operator: "is", value: null },
    ] }
    expect(evaluateGroup(g, get({ bank: "anything" }))).toBe(true)
  })
})

describe("evaluateFilterState", () => {
  const state: FilterState = {
    combinator: "or",
    groups: [
      { id: "g1", combinator: "and", conditions: [{ id: "a", columnId: "bank", operator: "is", value: "HSBC" }] },
      { id: "g2", combinator: "and", conditions: [{ id: "b", columnId: "balance", operator: "gt", value: 1000 }] },
    ],
  }
  it("top OR matches either group", () => {
    expect(evaluateFilterState(state, get({ bank: "HSBC", balance: 1 }))).toBe(true)
    expect(evaluateFilterState(state, get({ bank: "Citi", balance: 5000 }))).toBe(true)
    expect(evaluateFilterState(state, get({ bank: "Citi", balance: 1 }))).toBe(false)
  })
  it("top AND requires all groups", () => {
    const andState: FilterState = { ...state, combinator: "and" }
    expect(evaluateFilterState(andState, get({ bank: "HSBC", balance: 5000 }))).toBe(true)
    expect(evaluateFilterState(andState, get({ bank: "HSBC", balance: 1 }))).toBe(false)
  })
  it("empty state is no constraint", () => {
    expect(evaluateFilterState(emptyFilterState(), get({}))).toBe(true)
  })
})

describe("isConditionComplete / countActiveConditions", () => {
  it("complete when value non-empty", () => {
    expect(isConditionComplete({ id: "a", columnId: "x", operator: "is", value: "v" })).toBe(true)
    expect(isConditionComplete({ id: "a", columnId: "x", operator: "is", value: null })).toBe(false)
  })
  it("counts only complete conditions across groups", () => {
    const state: FilterState = { combinator: "and", groups: [
      { id: "g1", combinator: "and", conditions: [
        { id: "a", columnId: "x", operator: "is", value: "v" },
        { id: "b", columnId: "y", operator: "is", value: null },
      ] },
      { id: "g2", combinator: "and", conditions: [{ id: "c", columnId: "z", operator: "is", value: "w" }] },
    ] }
    expect(countActiveConditions(state)).toBe(2)
  })
})

describe("tree mutation helpers", () => {
  const tdefs: FilterDef[] = [{ id: "bank", label: "Bank", type: "select", options: [] }]
  it("emptyFilterState / newGroup", () => {
    expect(emptyFilterState()).toEqual({ combinator: "and", groups: [] })
    expect(newGroup("g1", "c1", tdefs)).toEqual({
      id: "g1", combinator: "and",
      conditions: [{ id: "c1", columnId: "bank", operator: "isAnyOf", value: null }],
    })
  })
  it("addGroup appends a seeded group", () => {
    const s = addGroup(emptyFilterState(), "g1", "c1", tdefs)
    expect(s.groups).toHaveLength(1)
    expect(s.groups[0].conditions).toHaveLength(1)
  })
  it("add / update / remove condition", () => {
    let s = addGroup(emptyFilterState(), "g1", "c1", tdefs)
    s = addConditionToGroup(s, "g1", { id: "c2", columnId: "bank", operator: "is", value: "HSBC" })
    expect(s.groups[0].conditions).toHaveLength(2)
    s = updateConditionInGroup(s, "g1", { id: "c2", columnId: "bank", operator: "is", value: "Citi" })
    expect(s.groups[0].conditions[1].value).toBe("Citi")
    s = removeConditionFromGroup(s, "g1", "c2")
    expect(s.groups[0].conditions).toHaveLength(1)
  })
  it("removing the last condition drops the group", () => {
    let s = addGroup(emptyFilterState(), "g1", "c1", tdefs)
    s = removeConditionFromGroup(s, "g1", "c1")
    expect(s.groups).toHaveLength(0)
  })
  it("setGroupCombinator / setTopCombinator / removeGroup", () => {
    let s = addGroup(emptyFilterState(), "g1", "c1", tdefs)
    s = setGroupCombinator(s, "g1", "or"); expect(s.groups[0].combinator).toBe("or")
    s = setTopCombinator(s, "or"); expect(s.combinator).toBe("or")
    s = removeGroup(s, "g1"); expect(s.groups).toHaveLength(0)
  })
  it("normalizeFilterState drops unknown columns and prunes empty groups", () => {
    const state: FilterState = { combinator: "and", groups: [
      { id: "g1", combinator: "and", conditions: [
        { id: "a", columnId: "bank", operator: "is", value: "HSBC" },
        { id: "b", columnId: "ghost", operator: "is", value: "x" },
      ] },
      { id: "g2", combinator: "and", conditions: [{ id: "c", columnId: "ghost", operator: "is", value: "x" }] },
    ] }
    const result = normalizeFilterState(state, ["bank"])
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].conditions.map((c) => c.id)).toEqual(["a"])
  })
})
