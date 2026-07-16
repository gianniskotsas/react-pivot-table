import type { AggregationMethod } from "./types"

/**
 * Pure aggregation over numeric values, shared by the footer's client-side
 * scope and (by convention — the dev's own `computeAggregate` implementation
 * is expected to mirror this) the server path.
 *
 * `count` counts every value regardless of blankness (matches "row count"
 * semantics); sum/avg/min/max ignore null/undefined/NaN entries so a blank
 * cell doesn't corrupt the result. An all-blank/empty input returns 0 for
 * sum (the additive identity) and NaN for avg/min/max, since there's no
 * meaningful average/min/max of nothing — callers format NaN as an em dash
 * rather than the literal string "NaN".
 */
export function aggregate(
  method: AggregationMethod,
  values: (number | null | undefined)[],
): number {
  if (method === "count") return values.length

  // typeof check matters: Number.isNaN alone lets non-number values (e.g. a
  // string, when calculableColumns points at a text column) slip through the
  // type predicate untouched — and `0 + "abc"` concatenates instead of adding.
  const nums = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v))
  switch (method) {
    case "sum":
      return nums.reduce((a, b) => a + b, 0)
    case "avg":
      return nums.length === 0 ? Number.NaN : nums.reduce((a, b) => a + b, 0) / nums.length
    case "min":
      return nums.length === 0 ? Number.NaN : Math.min(...nums)
    case "max":
      return nums.length === 0 ? Number.NaN : Math.max(...nums)
  }
}

/** Human-readable labels for the method picker UI. */
export const AGGREGATION_METHOD_LABELS: Record<AggregationMethod, string> = {
  sum: "Sum",
  avg: "Average",
  min: "Min",
  max: "Max",
  count: "Count",
}

/** Ordered list of all methods, for the picker's option list. */
export const ALL_AGGREGATION_METHODS: AggregationMethod[] = ["sum", "avg", "min", "max", "count"]
