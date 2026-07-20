import type { Row, VisibilityState } from "@tanstack/react-table"

import type { GroupColumnConfig } from "./types"

/**
 * Count shown next to a group label.
 *
 * "leaf" (default) counts the underlying DATA records in the group. TanStack's
 * `row.getLeafRows()` flattens the whole subtree and includes intermediate
 * grouped rows (e.g. nested bank groups), so those are filtered out to count
 * only real records. "immediate" counts direct sub-rows (groups or records).
 */
export function getGroupRowCount<TData>(
  row: Row<TData>,
  countMode: GroupColumnConfig<TData>["countMode"] = "leaf",
): number {
  return countMode === "immediate"
    ? row.subRows.length
    : row.getLeafRows().filter((leaf) => !leaf.getIsGrouped()).length
}

/**
 * Flattens a set of top-level rows (which may be group rows, or already
 * leaves for a flat table) down to their underlying LEAF rows, exactly once
 * each, in DFS order — regardless of current expand/collapse state.
 *
 * Deliberately walks each row's own subtree via TanStack's `row.getLeafRows()`
 * (which recurses through `.subRows`) rather than reading a row MODEL's own
 * `.flatRows` off `getSortedRowModel()`/`getGroupedRowModel()`: verified
 * empirically that `getSortedRowModel().flatRows` inherits a duplication bug
 * whenever no sort is active and grouping is on — its memo short-circuits by
 * returning `getGroupedRowModel()` unchanged, and THAT model's own `.flatRows`
 * bookkeeping pushes every leaf row in twice (once from its base-case
 * recursion, once from the grouping branch's own loop). Filtering that array
 * by "not a group row" still leaves every leaf duplicated and silently
 * doubles any sum/count built from it. `row.getLeafRows()` itself uses a
 * correct, non-duplicating flatten and is a per-ROW method, not a row MODEL's
 * memoized field, so it isn't affected by that bug — but for a leaf row (no
 * grouping, or an already-leaf top-level row) it returns an empty array (a
 * leaf has no subRows to flatten), so leaf rows must be collected directly
 * rather than through `getLeafRows()`. With grouping off, every row passed in
 * is already a leaf and this returns them unchanged, one-for-one.
 */
export function collectLeafRows<TData>(rows: Row<TData>[]): Row<TData>[] {
  const leaves: Row<TData>[] = []
  for (const row of rows) {
    if (row.getIsGrouped()) {
      leaves.push(...row.getLeafRows().filter((leaf) => !leaf.getIsGrouped()))
    } else {
      leaves.push(row)
    }
  }
  return leaves
}

/** Keep only allowed ids, preserve order, dedupe. */
export function normalizeGrouping(
  grouping: string[],
  allowedIds: string[],
): string[] {
  const allowed = new Set(allowedIds)
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of grouping) {
    if (allowed.has(id) && !seen.has(id)) {
      seen.add(id)
      result.push(id)
    }
  }
  return result
}

/**
 * Hide dimension columns that are currently part of the grouping. Only grouped
 * ids are returned (mapped to `false`); absent keys fall back to TanStack's
 * default of visible, so ungrouping a column re-shows it automatically.
 */
export function deriveColumnVisibility(grouping: string[]): VisibilityState {
  const visibility: VisibilityState = {}
  for (const id of grouping) {
    visibility[id] = false
  }
  return visibility
}
