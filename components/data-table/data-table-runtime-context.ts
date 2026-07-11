"use client"

import * as React from "react"

import type { DataTableRuntime } from "./types"

/**
 * Carries the live DataTableRuntime (active/editing cell, navigation,
 * updateData) to cell renderers built by defineColumns, without prop-drilling
 * through every ColumnDef. Null outside a <DataTable> (or when a column
 * built with defineColumns is rendered in a plain table — see define-columns.ts's
 * fallback-to-display behavior in that case).
 */
export const DataTableRuntimeContext = React.createContext<DataTableRuntime | null>(null)

export function useDataTableRuntime(): DataTableRuntime | null {
  return React.useContext(DataTableRuntimeContext)
}
