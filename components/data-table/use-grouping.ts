"use client"

import * as React from "react"
import type {
  ExpandedState,
  OnChangeFn,
  VisibilityState,
} from "@tanstack/react-table"

import { deriveColumnVisibility, normalizeGrouping } from "./grouping-utils"
import type { DataTableGroupingConfig } from "./types"

const EMPTY_GROUPING: string[] = []
const EMPTY_VISIBILITY: VisibilityState = {}

export type UseGroupingResult = {
  enabled: boolean
  grouping: string[]
  setGrouping: (next: string[]) => void
  expanded: ExpandedState
  setExpanded: OnChangeFn<ExpandedState>
  /** Grouped dimension columns hidden so their values show only in the group column. */
  derivedVisibility: VisibilityState
}

/**
 * Grouping + expansion state for DataTable. Returns an inert, stable result when
 * `config` is undefined so a flat table allocates no grouping state and its
 * visibility merge is a no-op.
 */
export function useGrouping<TData>(
  config: DataTableGroupingConfig<TData> | undefined,
): UseGroupingResult {
  const enabled = config != null

  // Key on the dimension IDS, not the config object: consumers routinely pass
  // an inline `grouping={{ ... }}` literal, which is a fresh object every
  // render. Memoizing on its identity would hand a new `setGrouping` and a new
  // `derivedVisibility` to the table on every render.
  const allowedKey = config ? config.dimensions.map((d) => d.id).join(" ") : ""
  const allowedIds = React.useMemo(
    () => (allowedKey === "" ? EMPTY_GROUPING : allowedKey.split(" ")),
    [allowedKey],
  )

  const [grouping, setGroupingState] = React.useState<string[]>(() =>
    config
      ? normalizeGrouping(
          config.initial ?? [],
          config.dimensions.map((d) => d.id),
        )
      : EMPTY_GROUPING,
  )
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  const setGrouping = React.useCallback(
    (next: string[]) => setGroupingState(normalizeGrouping(next, allowedIds)),
    [allowedIds],
  )

  const derivedVisibility = React.useMemo(
    () => (enabled ? deriveColumnVisibility(grouping) : EMPTY_VISIBILITY),
    [enabled, grouping],
  )

  return { enabled, grouping, setGrouping, expanded, setExpanded, derivedVisibility }
}
