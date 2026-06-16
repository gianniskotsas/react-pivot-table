import type { Row, VisibilityState } from "@tanstack/react-table"

import type { GroupColumnConfig } from "./types"

/** Count shown next to a group label. */
export function getGroupRowCount<TData>(
  row: Row<TData>,
  countMode: GroupColumnConfig<TData>["countMode"] = "leaf",
): number {
  return countMode === "immediate"
    ? row.subRows.length
    : row.getLeafRows().length
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

/** Hide dimension columns that are currently part of the grouping. */
export function deriveColumnVisibility(grouping: string[]): VisibilityState {
  const visibility: VisibilityState = {}
  for (const id of grouping) {
    visibility[id] = false
  }
  return visibility
}
