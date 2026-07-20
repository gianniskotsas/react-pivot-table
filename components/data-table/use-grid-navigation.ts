"use client"

import * as React from "react"

import type { CellPos, MoveDirection } from "./types"

export type UseGridNavigationOptions = {
  rowIds: string[]
  columnIds: string[]
  /**
   * Whether THIS cell may enter edit mode. Per-cell, not per-column: under
   * grouping the same column is editable on a leaf row and not on a group row.
   * `use-data-table.ts` composes the column-level override with a group-row check.
   */
  isCellEditable: (pos: CellPos) => boolean
}

export type GridNavigation = {
  activeCell: CellPos | null
  editingCell: CellPos | null
  isActive: (pos: CellPos) => boolean
  isEditing: (pos: CellPos) => boolean
  setActiveCell: (pos: CellPos) => void
  beginEdit: (pos: CellPos) => void
  stopEditing: () => void
  moveActive: (dir: MoveDirection) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
}

function samePos(a: CellPos | null, b: CellPos): boolean {
  return a != null && a.rowId === b.rowId && a.columnId === b.columnId
}

/**
 * Pure grid navigation: active/editing cell state + keyboard handling, over
 * plain row/column id lists. No TanStack Table dependency — testable with
 * fabricated ids. `use-data-table.ts` supplies the real ids and combines this
 * with column-editability and data persistence into the full DataTableRuntime.
 *
 * Two responsibilities that belong to `use-data-table.ts`, not here:
 * 1. Memoize `rowIds`/`columnIds` (e.g. `useMemo` over `table.getRowModel().rows`).
 *    `moveActive`/`handleKeyDown` depend on both arrays by reference, so a
 *    fresh array every render defeats memoization on every consumer.
 * 2. Revalidate `activeCell` when the id lists change under it (sort/filter/
 *    delete) — see the comment on the orphaned-id guard in `moveActive` below.
 */
export function useGridNavigation({
  rowIds,
  columnIds,
  isCellEditable,
}: UseGridNavigationOptions): GridNavigation {
  const [activeCell, setActiveCellState] = React.useState<CellPos | null>(null)
  const [editingCell, setEditingCell] = React.useState<CellPos | null>(null)

  const setActiveCell = React.useCallback((pos: CellPos) => {
    // Focusing a different cell always exits whatever was being edited — a
    // click elsewhere is an implicit "stop editing", not a silent orphan of
    // editingCell (which would otherwise still be "editing" a cell that's no
    // longer active, while the newly active cell shows no editor).
    setEditingCell(null)
    setActiveCellState(pos)
  }, [])

  const beginEdit = React.useCallback(
    (pos: CellPos) => {
      if (!isCellEditable(pos)) return
      setActiveCellState(pos)
      setEditingCell(pos)
    },
    [isCellEditable],
  )

  const stopEditing = React.useCallback(() => {
    setEditingCell(null)
  }, [])

  const moveActive = React.useCallback(
    (dir: MoveDirection) => {
      setEditingCell(null)
      setActiveCellState((current) => {
        if (rowIds.length === 0 || columnIds.length === 0) return current
        if (!current) return { rowId: rowIds[0], columnId: columnIds[0] }

        const rowIdx = rowIds.indexOf(current.rowId)
        const colIdx = columnIds.indexOf(current.columnId)
        // `current` points at a row/column id no longer in the live lists —
        // e.g. a sort/filter/delete on the table removed it while it was
        // active. This hook is deliberately table-agnostic (see the module
        // doc comment) and has no principled way to pick a replacement
        // position, so it holds still rather than guessing. The owner of
        // `rowIds`/`columnIds` (use-data-table.ts) is responsible for
        // resetting or revalidating `activeCell` — e.g. via setActiveCell —
        // when the id lists it derives from the table change out from under
        // an active cell; a silently-frozen active cell is otherwise a real
        // dead end for keyboard navigation.
        if (rowIdx === -1 || colIdx === -1) return current

        if (dir === "up") {
          return { rowId: rowIds[Math.max(0, rowIdx - 1)], columnId: current.columnId }
        }
        if (dir === "down") {
          return {
            rowId: rowIds[Math.min(rowIds.length - 1, rowIdx + 1)],
            columnId: current.columnId,
          }
        }
        if (dir === "prev") {
          if (colIdx > 0) return { rowId: current.rowId, columnId: columnIds[colIdx - 1] }
          if (rowIdx > 0) {
            return { rowId: rowIds[rowIdx - 1], columnId: columnIds[columnIds.length - 1] }
          }
          return current
        }
        // "next"
        if (colIdx < columnIds.length - 1) {
          return { rowId: current.rowId, columnId: columnIds[colIdx + 1] }
        }
        if (rowIdx < rowIds.length - 1) {
          return { rowId: rowIds[rowIdx + 1], columnId: columnIds[0] }
        }
        return current
      })
    },
    [rowIds, columnIds],
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (editingCell) {
        if (e.key === "Escape") {
          stopEditing()
          e.preventDefault()
        }
        return
      }
      if (!activeCell) return
      switch (e.key) {
        case "ArrowUp":
          moveActive("up")
          e.preventDefault()
          break
        case "ArrowDown":
          moveActive("down")
          e.preventDefault()
          break
        case "ArrowLeft":
          moveActive("prev")
          e.preventDefault()
          break
        case "ArrowRight":
          moveActive("next")
          e.preventDefault()
          break
        case "Tab":
          moveActive(e.shiftKey ? "prev" : "next")
          e.preventDefault()
          break
        case "Enter":
          beginEdit(activeCell)
          e.preventDefault()
          break
        default:
          break
      }
    },
    [activeCell, editingCell, moveActive, beginEdit, stopEditing],
  )

  return {
    activeCell,
    editingCell,
    isActive: (pos) => samePos(activeCell, pos),
    isEditing: (pos) => samePos(editingCell, pos),
    setActiveCell,
    beginEdit,
    stopEditing,
    moveActive,
    handleKeyDown,
  }
}
