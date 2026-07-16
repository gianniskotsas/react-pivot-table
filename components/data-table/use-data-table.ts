"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnPinningState,
  type ColumnSizingState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Table,
  type VisibilityState,
} from "@tanstack/react-table"
import { toast } from "sonner"

import { useGridNavigation } from "./use-grid-navigation"
import { buildRowGutterColumn, ROW_GUTTER_COLUMN_ID } from "./row-gutter"
import { createUndoStack, type CellEdit } from "./undo"
import { gridToTsv, parseTsv, planPaste } from "./clipboard"
import { evaluateFilterState, normalizeFilterState, emptyFilterState } from "./filter-utils"
import type { DataTableColumnMeta, DataTableRuntime, FilterDef, FilterState } from "./types"

// Stable empty default so omitting `filterableColumns` doesn't create a new
// array reference each render (which would churn the derived memos/callbacks).
const EMPTY_FILTER_COLUMNS: FilterDef[] = []

export type UseDataTableOptions<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  getRowId?: (row: TData, index: number) => string
  editable?: boolean
  onUpdateData?: (rowId: string, columnId: string, value: unknown) => void
  /** Reports rows a paste block extends past the last existing row — the library never appends to `data` itself, matching onUpdateData's own contract. */
  onCreateRows?: (partialRows: Partial<TData>[]) => void
  enablePagination?: boolean
  /** Prepends the row-number/selection gutter column. Defaults to false. */
  enableRowSelection?: boolean
  /** True when pagination is server-driven — loaded rows aren't necessarily all rows. Defaults to false. */
  manualPagination?: boolean
  /** Total row count across all pages/filters when manualPagination is true. */
  totalRowCount?: number
  /**
   * Columns frozen from the start, e.g. { left: ["name"], right: [] }.
   * Applied once at mount; users can still change pinning afterwards via the
   * Columns menu (per-column enablePinning permitting).
   */
  initialColumnPinning?: ColumnPinningState
  /** Declares which columns are filterable and how (the filter "options"). */
  filterableColumns?: FilterDef[]
  /** Initial filter state (groups + AND/OR). */
  initialFilterState?: FilterState
}

export type UseDataTableResult<TData> = {
  table: Table<TData>
  runtime: DataTableRuntime
  filterState: FilterState
  setFilterState: (next: FilterState | ((prev: FilterState) => FilterState)) => void
}

export function useDataTable<TData>({
  data,
  columns,
  getRowId,
  editable = false,
  onUpdateData,
  onCreateRows,
  enablePagination = true,
  enableRowSelection = false,
  manualPagination = false,
  totalRowCount,
  initialColumnPinning,
  filterableColumns = EMPTY_FILTER_COLUMNS,
  initialFilterState,
}: UseDataTableOptions<TData>): UseDataTableResult<TData> {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    () => initialColumnPinning ?? {},
  )
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [isAllMatchingSelected, setIsAllMatchingSelectedState] = React.useState(false)

  const filterableIds = React.useMemo(
    () => filterableColumns.map((f) => f.id),
    [filterableColumns],
  )

  const [filterState, setFilterStateRaw] = React.useState<FilterState>(() =>
    normalizeFilterState(initialFilterState ?? emptyFilterState(), filterableIds),
  )

  const setFilterState = React.useCallback(
    (next: FilterState | ((prev: FilterState) => FilterState)) => {
      setFilterStateRaw((prev) =>
        normalizeFilterState(typeof next === "function" ? next(prev) : next, filterableIds),
      )
    },
    [filterableIds],
  )

  // Pre-filter rows against the FilterState tree, then hand the result to
  // TanStack — mirrors grouped-data-table's use-grouped-table.ts exactly, so
  // getPrePaginationRowModel()/getCoreRowModel() downstream (paste-boundary
  // detection, commitBatch's row lookup) already reflect "post-filter" rows.
  // Values are read by accessorKey via `row[columnId]` — see FilterDef.id.
  const filteredData = React.useMemo(() => {
    if (filterState.groups.length === 0) return data
    return data.filter((row) =>
      evaluateFilterState(filterState, (columnId) => (row as Record<string, unknown>)[columnId]),
    )
  }, [data, filterState])

  const resolvedColumns = React.useMemo(
    () => (enableRowSelection ? [buildRowGutterColumn<TData>(), ...columns] : columns),
    [enableRowSelection, columns],
  )

  // React Compiler reports "Use of incompatible library" here: useReactTable
  // returns identity-stable functions it cannot safely memoize, so it skips
  // compiling this component. Expected with TanStack Table, harmless.
  const table = useReactTable<TData>({
    data: filteredData,
    columns: resolvedColumns,
    getRowId: getRowId ?? ((row, index) => String(index)),
    state: {
      sorting,
      columnVisibility,
      columnPinning,
      columnSizing,
      rowSelection,
      ...(enablePagination ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    enableRowSelection,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(enablePagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    autoResetPageIndex: false,
  })

  // autoResetPageIndex: false keeps the user's page across data edits, but
  // TanStack never clamps: if a filter shrinks the row count while the user
  // sits on page 3 of what is now 1 page, getPaginationRowModel slices
  // rows.slice(100, 150) of a 4-row model and renders an empty table ("No
  // results." + "Page 3 of 1"). Snap back to the last real page instead.
  // Guarded to pageCount > 0: manual pagination without a known total
  // reports -1, and an empty result set reports 0 (nothing to snap to).
  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex
  React.useEffect(() => {
    if (enablePagination && pageCount > 0 && pageIndex > pageCount - 1) {
      table.setPageIndex(pageCount - 1)
    }
  }, [enablePagination, pageCount, pageIndex, table])

  // Deliberately asymmetric: turning matching ON also selects every loaded
  // row (so visible checkboxes agree with "everything"); turning it OFF does
  // NOT deselect — see DataTableRuntime.setAllMatchingSelected's doc comment
  // (types.ts) for why: the caller (row-gutter's header click-cycle) may be
  // narrowing from "all-matching" back to "all loaded" rather than to "none".
  const setAllMatchingSelected = React.useCallback(
    (matching: boolean) => {
      setIsAllMatchingSelectedState(matching)
      if (matching) table.toggleAllRowsSelected(true)
    },
    [table],
  )

  // Tracks the row a shift-click range should extend from, by id — the row
  // touched by the most recent plain (non-shift) toggle, or the far end of
  // the most recent shift-range. Deliberately an id, not a positional index:
  // TanStack's `Row.index` is fixed at row creation to the row's position in
  // the original, unsorted `data`, not its current on-screen position (see
  // row-gutter.tsx's `displayIndex` comment) — an index captured at click
  // time would point at the wrong row once sorting/filtering reorders the
  // table. Both the anchor's and the clicked row's actual positions are
  // resolved fresh from the live row model on every call instead.
  const lastToggledRowIdRef = React.useRef<string | null>(null)
  const toggleRowSelected = React.useCallback(
    (rowId: string, checked: boolean, shiftKey: boolean) => {
      const currentRows = table.getRowModel().rows
      const anchorId = lastToggledRowIdRef.current
      const anchorIndex = anchorId === null ? -1 : currentRows.findIndex((r) => r.id === anchorId)
      if (shiftKey && anchorIndex !== -1) {
        const clickedIndex = currentRows.findIndex((r) => r.id === rowId)
        if (clickedIndex !== -1) {
          const [start, end] =
            anchorIndex < clickedIndex ? [anchorIndex, clickedIndex] : [clickedIndex, anchorIndex]
          setRowSelection((prev) => {
            const next = { ...prev }
            for (let i = start; i <= end; i++) {
              const r = currentRows[i]
              if (r) next[r.id] = checked
            }
            return next
          })
        }
      } else {
        table.getRow(rowId)?.toggleSelected(checked)
      }
      lastToggledRowIdRef.current = rowId
    },
    [table],
  )

  // Plain history stack in a ref (not React state) — its own internal
  // past/future arrays are mutated directly by push/undo/redo, so a ref
  // avoids re-render-triggered staleness entirely. canUndo/canRedo ARE
  // separate React state, re-synced after every stack mutation, purely so
  // consumers (and this file's own composed handleKeyDown) can read them
  // reactively without polling the stack's own canUndo()/canRedo() methods
  // on every render.
  const undoStackRef = React.useRef(createUndoStack())
  const [canUndo, setCanUndo] = React.useState(false)
  const [canRedo, setCanRedo] = React.useState(false)
  const syncUndoState = React.useCallback(() => {
    setCanUndo(undoStackRef.current.canUndo())
    setCanRedo(undoStackRef.current.canRedo())
  }, [])

  // Applies a batch of cell writes as ONE undo step (a paste or bulk-clear,
  // added in a later task), vs. `updateData` below which is always a
  // one-cell batch. Reads each cell's CURRENT value via table.getRow BEFORE
  // calling onUpdateData for any of them, so undo restores every cell to
  // what it held right before this batch, not to some value produced by an
  // earlier cell in the same batch. Two ops in one batch can target the same
  // cell (e.g. a degenerate paste) — `prev` keeps the FIRST occurrence's
  // captured value (matching "undo restores pre-batch state"), but `next` is
  // updated to each LATER duplicate's value as it's seen, so it tracks
  // whatever ends up ACTUALLY applied (every op below still calls
  // onUpdateData, un-deduped) rather than freezing on the first one — undo
  // then redo on such a batch reproduces the real end state, not an
  // intermediate one only the first duplicate ever held.
  const commitBatch = React.useCallback(
    (ops: { rowId: string; columnId: string; value: unknown }[]) => {
      if (ops.length === 0) return
      const indexByKey = new Map<string, number>()
      const batch: CellEdit[] = []
      for (const op of ops) {
        const key = `${op.rowId}:${op.columnId}`
        const existingIndex = indexByKey.get(key)
        if (existingIndex !== undefined) {
          batch[existingIndex].next = op.value
          continue
        }
        indexByKey.set(key, batch.length)
        batch.push({
          rowId: op.rowId,
          columnId: op.columnId,
          prev: table.getRow(op.rowId)?.getValue(op.columnId),
          next: op.value,
        })
      }
      undoStackRef.current.push(batch)
      syncUndoState()
      for (const op of ops) onUpdateData?.(op.rowId, op.columnId, op.value)
    },
    [onUpdateData, table, syncUndoState],
  )

  const undo = React.useCallback(() => {
    const batch = undoStackRef.current.undo()
    if (!batch) return
    syncUndoState()
    for (const edit of batch) onUpdateData?.(edit.rowId, edit.columnId, edit.prev)
    toast("Change undone", { action: { label: "Redo", onClick: () => redoRef.current() } })
  }, [onUpdateData, syncUndoState])

  const redo = React.useCallback(() => {
    const batch = undoStackRef.current.redo()
    if (!batch) return
    syncUndoState()
    for (const edit of batch) onUpdateData?.(edit.rowId, edit.columnId, edit.next)
    toast("Change redone", { action: { label: "Undo", onClick: () => undoRef.current() } })
  }, [onUpdateData, syncUndoState])

  // undo's toast Redo button needs to call redo, and vice versa, but each
  // callback is declared before the other exists — resolved via two refs
  // updated on every render (a plain ref write, not a useEffect) so the
  // toast buttons always invoke the LATEST undo/redo closures even if a
  // toast from an earlier render is still on screen when clicked.
  const undoRef = React.useRef(undo)
  const redoRef = React.useRef(redo)
  undoRef.current = undo
  redoRef.current = redo

  const rows = table.getRowModel().rows
  const rowIds = React.useMemo(() => rows.map((r) => r.id), [rows])

  // Paste's "past the last row" detection must be measured against every
  // row that exists client-side, not just the current page's slice —
  // getRowModel() is post-pagination, so using `rowIds` here would treat a
  // page boundary as the end of the dataset and spuriously create new rows
  // instead of writing into real rows that live on the next page.
  // getPrePaginationRowModel() falls back to the sorted/filtered model
  // (unaffected by pagination) whenever row expanding isn't configured,
  // which this table never does.
  const prePaginationRows = table.getPrePaginationRowModel().rows
  const pasteRowIds = React.useMemo(
    () => prePaginationRows.map((r) => r.id),
    [prePaginationRows],
  )

  // If the header's select-all cycle has advanced to "all matching"
  // (isAllMatchingSelected), a `data` change that reveals rows not seen
  // before — a new server page loading, a filter narrowing/widening under
  // manualPagination — must keep those newly-visible rows selected too.
  // setAllMatchingSelected's own contract (types.ts) is that this flag means
  // "everything matching is selected, including rows not yet loaded"; left
  // unaddressed, the header would keep asserting that while the freshly-
  // loaded rows' own checkboxes render unselected (rowSelection is keyed by
  // id, and the new rows' ids were never in it) — a directly visible,
  // self-contradictory state. This mirrors setAllMatchingSelected's own
  // "turning matching ON also selects every loaded row" behavior, reapplied
  // whenever the loaded set itself changes while matching is already on.
  React.useEffect(() => {
    if (isAllMatchingSelected) table.toggleAllRowsSelected(true)
  }, [rowIds, isAllMatchingSelected, table])

  const visibleColumns = table.getVisibleLeafColumns()
  const columnIds = React.useMemo(
    () => visibleColumns.filter((c) => c.id !== ROW_GUTTER_COLUMN_ID).map((c) => c.id),
    [visibleColumns],
  )

  const isColumnEditable = React.useCallback(
    (columnId: string) => {
      const override = (
        table.getColumn(columnId)?.columnDef.meta as DataTableColumnMeta | undefined
      )?.editable
      return override ?? editable
    },
    [table, editable],
  )

  const nav = useGridNavigation({ rowIds, columnIds, isColumnEditable })

  // Copies either the active cell's value alone, or (when rows are
  // selected) every visible column of every selected row as TSV — mirrors
  // Excel/Sheets: a row selection takes priority over a single active cell.
  const copy = React.useCallback(async () => {
    const selectedRows = table.getSelectedRowModel().rows
    const clipboardColumns = (ids: string[]) =>
      ids.map((id) => {
        const meta = table.getColumn(id)?.columnDef.meta as DataTableColumnMeta | undefined
        return { id, toClipboard: meta?.toClipboard ?? ((v: unknown) => String(v ?? "")) }
      })

    let grid: unknown[][]
    let cols: ReturnType<typeof clipboardColumns>

    if (selectedRows.length > 0) {
      grid = selectedRows.map((row) => columnIds.map((id) => row.getValue(id)))
      cols = clipboardColumns(columnIds)
    } else {
      const active = nav.activeCell
      if (!active) return
      const row = table.getRow(active.rowId)
      grid = [[row.getValue(active.columnId)]]
      cols = clipboardColumns([active.columnId])
    }

    // navigator.clipboard.writeText's promise can reject (permission denied,
    // an unfocused document, an insecure context, a cross-origin iframe —
    // all real occurrences, especially in Safari/Firefox), and this is
    // invoked as `void copy()` in handleKeyDown below, so an unhandled
    // rejection here would otherwise surface as a console warning with zero
    // user-visible feedback that Ctrl+C silently did nothing.
    try {
      await navigator.clipboard.writeText(gridToTsv(grid, cols))
    } catch {
      toast.error("Couldn't copy to clipboard")
    }
  }, [table, columnIds, nav.activeCell])

  const paste = React.useCallback(async () => {
    const active = nav.activeCell
    if (!active) return
    // Same rejection risk as copy's writeText — readText can reject
    // (permission denied, unfocused document, etc.) and this is invoked as
    // `void paste()` in handleKeyDown, so an uncaught rejection here would
    // otherwise be a silent no-op with an unhandled-rejection console
    // warning instead of user-visible feedback.
    let text: string
    try {
      text = await navigator.clipboard.readText()
    } catch {
      toast.error("Couldn't read from clipboard")
      return
    }
    if (!text) return

    // Indexed into pasteRowIds (the full, pre-pagination row list), not the
    // current page's rowIds — see pasteRowIds' definition above for why.
    const startRowIndex = pasteRowIds.indexOf(active.rowId)
    const startColIndex = columnIds.indexOf(active.columnId)
    if (startRowIndex === -1 || startColIndex === -1) return

    const cols = columnIds.map((id) => {
      const meta = table.getColumn(id)?.columnDef.meta as DataTableColumnMeta | undefined
      return {
        id,
        toClipboard: meta?.toClipboard ?? ((v: unknown) => String(v ?? "")),
        // Gated through the SAME per-column editability check inline editing
        // uses — a column can have a working fromClipboard (every field
        // does) but still be non-editable, in which case paste must skip it
        // exactly like it would for a manual edit attempt.
        fromClipboard: isColumnEditable(id) ? meta?.fromClipboard : undefined,
      }
    })

    const plan = planPaste<TData>(parseTsv(text), startRowIndex, startColIndex, pasteRowIds, cols)
    if (plan.updates.length > 0) commitBatch(plan.updates)
    if (plan.newRows.length > 0) onCreateRows?.(plan.newRows)

    const cellCount =
      plan.updates.length + plan.newRows.reduce((n, row) => n + Object.keys(row).length, 0)
    if (cellCount > 0) toast(`Pasted ${cellCount} cell${cellCount === 1 ? "" : "s"}`)
  }, [nav.activeCell, pasteRowIds, columnIds, table, isColumnEditable, commitBatch, onCreateRows])

  // Clears every editable column of every selected row, or (when nothing is
  // selected) just the active cell if it's editable — same selection-wins
  // tie-break as `copy` above: a row selection always takes priority over
  // the active cell, even when the active cell sits outside the selection,
  // matching Excel/Sheets' Delete-key behavior.
  const clearSelectedOrActiveCells = React.useCallback(() => {
    const selectedRows = table.getSelectedRowModel().rows
    const editableColumnIds = columnIds.filter((id) => isColumnEditable(id))
    let ops: { rowId: string; columnId: string; value: unknown }[] = []

    if (selectedRows.length > 0) {
      ops = selectedRows.flatMap((row) =>
        editableColumnIds.map((columnId) => ({ rowId: row.id, columnId, value: undefined })),
      )
    } else if (nav.activeCell && isColumnEditable(nav.activeCell.columnId)) {
      ops = [{ rowId: nav.activeCell.rowId, columnId: nav.activeCell.columnId, value: undefined }]
    }

    if (ops.length === 0) return
    commitBatch(ops)
    toast(`Cleared ${ops.length} cell${ops.length === 1 ? "" : "s"}`)
  }, [table, columnIds, isColumnEditable, nav.activeCell, commitBatch])

  // Revalidate activeCell when rowIds/columnIds change out from under it.
  //
  // use-grid-navigation.ts's module doc comment and the orphaned-id guard
  // inside its `moveActive` both explicitly delegate this responsibility to
  // use-data-table.ts. That guard only protects a single in-flight move: if
  // `current` points at a row/column id no longer in the live lists, it
  // holds still rather than guessing a replacement. Left unaddressed here,
  // that "hold still" becomes permanent — a sort, filter, delete, or (as in
  // the tests below) an entirely new `data` array can remove the active
  // row/column, and every subsequent arrow-key/Tab press would keep
  // resolving `rowIds.indexOf(current.rowId) === -1` and silently no-op,
  // freezing keyboard navigation with no visible active cell to recover
  // from.
  //
  // GridNavigation's public API only exposes `setActiveCell(pos: CellPos)`
  // — there is no way to clear activeCell to `null` from outside the hook.
  // Widening that already-shipped, already-reviewed hook's API (e.g. adding
  // a `clearActiveCell`) is a bigger change than this task calls for, so
  // instead: when the previous activeCell's row or column id has dropped
  // out of the new lists, snap to a *column-stable, clamped-index* cell via
  // the existing `setActiveCell` rather than leaving it dangling or jumping
  // all the way back to the first cell in the grid. Concretely (mirrors how
  // Excel/Sheets handle a row disappearing): if only the row vanished, stay
  // on the same column and move to whatever row now sits at the vanished
  // row's PREVIOUS index (clamped to the new list's bounds) — i.e. whatever
  // slid into that slot, or the new last row if it was the last one. If
  // only the column vanished, the same clamped-index logic applies to the
  // column, with the row preserved. If both vanished, both adjustments
  // apply independently. This avoids losing scroll position/context for a
  // user editing deep in the grid when only one nearby row/column changes.
  //
  // `prevIdsRef` exists solely to answer "what index was the vanished id at
  // *before* this change?" — the previous id lists are looked up here, then
  // the ref is updated to the current lists at the end of the effect so the
  // next run has the immediately-prior lists to compare against. (It is
  // NOT used to gate whether the effect body runs: the effect's dependency
  // array already means React only invokes this effect when `rowIds`/
  // `columnIds` change by reference, so a same-reference check here would
  // be dead code.)
  //
  // If the grid has no rows or no columns at all, there is no valid CellPos
  // to snap to; nav's internal activeCell state is left as-is in that case.
  // Nothing renders with `isActive` matching it (there's no cell to match),
  // so the stale value is inert until rows/columns exist again, at which
  // point this effect re-validates it on the next rowIds/columnIds change.
  const prevIdsRef = React.useRef({ rowIds, columnIds })
  React.useEffect(() => {
    const prev = prevIdsRef.current
    const active = nav.activeCell

    if (active) {
      const rowStillValid = rowIds.includes(active.rowId)
      const columnStillValid = columnIds.includes(active.columnId)

      if ((!rowStillValid || !columnStillValid) && rowIds.length > 0 && columnIds.length > 0) {
        const prevRowIdx = prev.rowIds.indexOf(active.rowId)
        const nextRowId = rowStillValid
          ? active.rowId
          : rowIds[Math.min(Math.max(prevRowIdx, 0), rowIds.length - 1)]

        const prevColIdx = prev.columnIds.indexOf(active.columnId)
        const nextColumnId = columnStillValid
          ? active.columnId
          : columnIds[Math.min(Math.max(prevColIdx, 0), columnIds.length - 1)]

        nav.setActiveCell({ rowId: nextRowId, columnId: nextColumnId })
      }
    }

    prevIdsRef.current = { rowIds, columnIds }
    // nav.activeCell is intentionally excluded: it's read fresh from `nav`
    // each time this effect actually runs (gated by rowIds/columnIds
    // identity), and including it would re-run this effect on every
    // click/navigation even when the id lists haven't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowIds, columnIds, nav.setActiveCell])

  const updateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      commitBatch([{ rowId, columnId, value }])
    },
    [commitBatch],
  )

  // Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z, Cmd/Ctrl+C, Cmd/Ctrl+V, and
  // Delete/Backspace first; everything else falls through to grid
  // navigation's own handler unchanged. Deliberately layered here rather
  // than inside use-grid-navigation.ts — that hook's own module doc comment
  // scopes it to "pure grid navigation... no undo/clipboard concerns"
  // (Plan 2), and undo/copy/paste/clear genuinely need this file's
  // table/onUpdateData access that hook doesn't have.
  //
  // The `!nav.editingCell` guard on copy/paste/Delete/Backspace matters:
  // while actively typing in a text field mid-edit, these keys should act on
  // the SELECTED TEXT inside that input via the browser's own native
  // behavior (copy/paste/delete-a-character), not the grid's cell-level
  // versions — intercepting them here would break normal text editing.
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === "c" && !nav.editingCell) {
        e.preventDefault()
        void copy()
        return
      }
      if (mod && e.key.toLowerCase() === "v" && !nav.editingCell) {
        e.preventDefault()
        void paste()
        return
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !nav.editingCell) {
        e.preventDefault()
        clearSelectedOrActiveCells()
        return
      }
      nav.handleKeyDown(e)
    },
    [nav, undo, redo, copy, paste, clearSelectedOrActiveCells],
  )

  const runtime: DataTableRuntime = {
    ...nav,
    isColumnEditable,
    updateData,
    manualPagination,
    totalRowCount,
    isAllMatchingSelected,
    setAllMatchingSelected,
    toggleRowSelected,
    undo,
    redo,
    canUndo,
    canRedo,
    handleKeyDown,
  }

  return { table, runtime, filterState, setFilterState }
}
