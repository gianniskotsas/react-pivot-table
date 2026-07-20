"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnPinningState,
  type ColumnSizingState,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table,
  type VisibilityState,
} from "@tanstack/react-table"
import { toast } from "sonner"

import { useGridNavigation } from "./use-grid-navigation"
import { useGrouping } from "./use-grouping"
import { buildGroupColumn } from "./group-column"
import { buildRowGutterColumn, ROW_GUTTER_COLUMN_ID } from "./row-gutter"
import { createUndoStack, type CellEdit } from "./undo"
import { gridToTsv, parseTsv, planPaste } from "./clipboard"
import { evaluateFilterState, normalizeFilterState, emptyFilterState } from "./filter-utils"
import {
  GROUP_COLUMN_ID,
  type CellPos,
  type DataTableColumnMeta,
  type DataTableGroupingConfig,
  type DataTableRuntime,
  type FilterDef,
  type FilterState,
} from "./types"

// Stable empty default so omitting `filterableColumns` doesn't create a new
// array reference each render (which would churn the derived memos/callbacks).
const EMPTY_FILTER_COLUMNS: FilterDef[] = []

// TanStack only flattens an expanded group row's leaves into
// `table.getRowModel().rows` inside its real getPaginationRowModel utility —
// getExpandedRowModel's own fallback path (used whenever that utility isn't
// registered) unconditionally skips it. A flat table already registers the
// utility whenever enablePagination is on; when it's off, grouping still
// needs the utility registered so expansion works, but without a real
// `pagination` state driving it, TanStack falls back to its own default
// page size (10) and would silently truncate the table. This stable,
// effectively-unbounded page state avoids that while never actually
// paginating — a fresh object here would defeat useReactTable's own memo.
//
// An alternative was considered and rejected: `paginateExpandedRows:
// !enablePagination`. TanStack's RowPagination feature defines
// `getPrePaginationRowModel` as a plain alias for `getExpandedRowModel()`,
// and getExpandedRowModel's own memo does its OWN flatten
// (`expandRows(rowModel)`) whenever `paginateExpandedRows` is true — even
// with no `getPaginationRowModel` utility registered at all. That would let
// the enablePagination-off branch skip both this sentinel and the extra
// `getPaginationRowModel: getPaginationRowModel()` registration below.
// Rejected because `paginateExpandedRows` would then need to flip between
// true and false depending on `enablePagination`, changing what "expanded"
// means for `getPageCount`/`getRowCount` (both defined off
// `getPrePaginationRowModel().rows.length`) between the two modes — a second
// behavioral axis to keep in sync, for a case (grouping + pagination
// disabled) that's already exercised and green under this approach.
const UNBOUNDED_PAGINATION: PaginationState = { pageIndex: 0, pageSize: Number.MAX_SAFE_INTEGER }

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
  /** Opt-in row grouping. Omit for a flat table (no grouping state, no group column). */
  grouping?: DataTableGroupingConfig<TData>
}

export type UseDataTableResult<TData> = {
  table: Table<TData>
  runtime: DataTableRuntime
  filterState: FilterState
  setFilterState: (next: FilterState | ((prev: FilterState) => FilterState)) => void
  /** Current grouping hierarchy (empty when grouping is not configured). */
  grouping: string[]
  /** Sets the hierarchy, normalized against the declared dimensions. */
  setGrouping: (next: string[]) => void
  /** True when `rowId` refers to a synthesized group row rather than a data row. */
  isGroupRow: (rowId: string) => boolean
}

/**
 * Recursively collects every LEAF row's id under `rows` (which may be
 * top-level group rows, or already leaves for a flat table), in DFS order,
 * exactly once — regardless of current expand/collapse state. Deliberately
 * walks each row's own `.subRows` rather than reading TanStack's `.flatRows`
 * off the row model: `.flatRows` from a grouped row model contains each leaf
 * row TWICE (see the call site's comment for how this was verified), which
 * would corrupt `indexOf`-based paste-target lookups downstream. Used by
 * `pasteRowIds` below; not needed anywhere else in this file because
 * `table.getRowModel().rows` (used for on-screen navigation) is produced by
 * TanStack's own `getPaginationRowModel`, whose expansion step does its own
 * correct, dedup'd flatten.
 */
function collectLeafRowIds<TData>(rows: Row<TData>[]): string[] {
  const ids: string[] = []
  const visit = (row: Row<TData>) => {
    if (row.getIsGrouped()) {
      row.subRows.forEach(visit)
    } else {
      ids.push(row.id)
    }
  }
  rows.forEach(visit)
  return ids
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
  grouping: groupingConfig,
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

  const group = useGrouping(groupingConfig)

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

  // Memoize on `column.header`, not on the config object: consumers routinely
  // pass an inline literal (`grouping={{ dimensions: [...], column: {...} }}`),
  // a fresh object every render — depending on its identity would rebuild the
  // whole column array (and churn TanStack's internal column state) on every
  // render. `buildGroupColumn` only reads `config.header`, so that is the
  // only real dependency. Mirrors the precedent in `use-grouped-table.ts`'s
  // `groupColumnDef` memo.
  const groupColumnHeader = groupingConfig?.column.header
  const groupingEnabled = groupingConfig != null
  const resolvedColumns = React.useMemo(() => {
    const base = enableRowSelection ? [buildRowGutterColumn<TData>(), ...columns] : columns
    if (!groupingEnabled) return base
    return [buildGroupColumn<TData>({ header: groupColumnHeader }), ...base]
    // `groupColumnHeader` is the only field buildGroupColumn reads; depending on
    // the whole config object would rebuild this array on every render for
    // consumers passing an inline literal.
    //
    // Caveat: `header` is typed `React.ReactNode`, so this only actually
    // avoids churn when the consumer passes a stable reference (a string, or
    // a module-level/memoized element) — a consumer writing an inline
    // `column={{ header: <span>Deal</span>, ... }}` still hands a fresh
    // ReactNode every render, and this memo churns anyway. `useGrouping`'s
    // sibling memo (`allowedKey`) sidesteps this entirely by keying on a
    // joined string of dimension ids rather than anything consumer-supplied.
  }, [enableRowSelection, columns, groupingEnabled, groupColumnHeader])

  // Grouped dimension columns must stay hidden regardless of what the user
  // toggled in the Columns menu, so the derived map is spread last.
  const effectiveColumnVisibility = React.useMemo(
    () => ({ ...columnVisibility, ...group.derivedVisibility }),
    [columnVisibility, group.derivedVisibility],
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
      columnVisibility: effectiveColumnVisibility,
      columnPinning,
      columnSizing,
      rowSelection,
      ...(group.enabled ? { grouping: group.grouping, expanded: group.expanded } : {}),
      ...(enablePagination
        ? { pagination }
        : group.enabled
          ? { pagination: UNBOUNDED_PAGINATION }
          : {}),
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
    // Registered whenever grouping is on, even with enablePagination off —
    // see UNBOUNDED_PAGINATION's comment above for why.
    ...(enablePagination || group.enabled
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    autoResetPageIndex: false,
    ...(group.enabled
      ? {
          onGroupingChange: (updater) =>
            group.setGrouping(
              typeof updater === "function" ? updater(group.grouping) : updater,
            ),
          onExpandedChange: group.setExpanded,
          getGroupedRowModel: getGroupedRowModel(),
          getExpandedRowModel: getExpandedRowModel(),
          enableSubRowSelection: true,
          paginateExpandedRows: false,
          autoResetExpanded: false,
        }
      : {}),
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

  // Group rows carry TanStack-synthesised ids (e.g. "stage:won"), never TData
  // ids — they must never reach updateData. A Set keeps the lookup O(1) and
  // avoids table.getRow() throwing on an id that has since disappeared.
  const groupRowIds = React.useMemo(
    () => new Set(rows.filter((r) => r.getIsGrouped()).map((r) => r.id)),
    [rows],
  )
  const isGroupRow = React.useCallback(
    (rowId: string) => groupRowIds.has(rowId),
    [groupRowIds],
  )

  // Paste's "past the last row" detection must be measured against every
  // row that exists client-side, not just the current page's slice —
  // getRowModel() is post-pagination, so using `rowIds` here would treat a
  // page boundary as the end of the dataset and spuriously create new rows
  // instead of writing into real rows that live on the next page.
  // getPrePaginationRowModel() is TanStack's own alias for
  // getExpandedRowModel() (see RowPagination.ts), which — with
  // paginateExpandedRows: false, as this table sets whenever grouping is on
  // — does NOT flatten: its `.rows` are top-level rows only (group rows when
  // grouping is active, leaf rows for a flat table), unaffected by
  // pagination either way.
  //
  // Leaf rows only: a paste block must never target a synthesized group row.
  // `collectLeafRowIds` below walks each top-level row's own `.subRows` (not
  // `.flatRows` — verified empirically that TanStack's getGroupedRowModel
  // pushes every leaf row into `.flatRows` TWICE, once from its base-case
  // recursion and again from the grouping branch's own bookkeeping loop, so
  // naively filtering `.flatRows` produces duplicate ids and breaks
  // `indexOf`-based lookups below) to collect every leaf id exactly once, in
  // DFS order, regardless of current expand/collapse state. With grouping
  // off, every row is already a leaf with no subRows, so this returns
  // exactly `rows.map(r => r.id)` — identical to before.
  const prePaginationRows = table.getPrePaginationRowModel().rows
  const pasteRowIds = React.useMemo(
    () => collectLeafRowIds(prePaginationRows),
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
  // Both ROW_GUTTER_COLUMN_ID and GROUP_COLUMN_ID are structural, table-owned
  // columns with no TData accessor — neither is real data, so neither may be
  // a stop in keyboard navigation, a clipboard column, or a bulk-clear
  // target. ROW_GUTTER_COLUMN_ID was already filtered here; GROUP_COLUMN_ID
  // (the synthesized "__group__" auto group column, present whenever
  // grouping is configured) previously wasn't, which let it be navigated to,
  // copied/pasted into, and bulk-cleared like a real editable column — see
  // buildGroupColumn's own `meta: { editable: false }` for the second half
  // of this fix (isColumnEditable's own resolution, independent of whether a
  // caller reaches it through this list at all).
  const columnIds = React.useMemo(
    () =>
      visibleColumns
        .filter((c) => c.id !== ROW_GUTTER_COLUMN_ID && c.id !== GROUP_COLUMN_ID)
        .map((c) => c.id),
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

  // Per-cell gate: column-level override AND not a synthesized group row.
  // `isColumnEditable` stays column-level for DataTableRuntime, clipboard
  // paste, and bulk-clear.
  const isCellEditable = React.useCallback(
    (pos: CellPos) => isColumnEditable(pos.columnId) && !isGroupRow(pos.rowId),
    [isColumnEditable, isGroupRow],
  )

  const nav = useGridNavigation({ rowIds, columnIds, isCellEditable })

  // Enter on a group row toggles expansion instead of entering edit mode
  // (isCellEditable already refuses to edit it). Composed here rather than
  // taught to useGridNavigation, which is deliberately table-agnostic. This
  // wraps (rather than replaces) nav.handleKeyDown, and is itself wrapped by
  // the file's own `handleKeyDown` below (which layers undo/copy/paste/clear
  // ahead of grid navigation) — see that callback's fallthrough.
  const handleKeyDownWithGroupExpand = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (
        e.key === "Enter" &&
        nav.activeCell &&
        !nav.editingCell &&
        isGroupRow(nav.activeCell.rowId)
      ) {
        table.getRow(nav.activeCell.rowId)?.toggleExpanded()
        e.preventDefault()
        return
      }
      nav.handleKeyDown(e)
    },
    [nav, isGroupRow, table],
  )

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
  //
  // Both branches must be incapable of ever emitting a synthesized group
  // row's id to onUpdateData: the active-cell branch is gated through
  // `isCellEditable` (column-level override AND not a group row), not just
  // `isColumnEditable` — a group row can carry an editable column (e.g.
  // "amount" is editable on leaves), so the column-only check alone would
  // let Delete on an active group-row cell straight through. The
  // selection branch is gated by filtering out grouped rows before mapping:
  // with `enableSubRowSelection: true` (set whenever grouping is on),
  // selecting a group row's checkbox also selects its leaf subRows, so
  // `getSelectedRowModel().rows` can contain both the group row AND its
  // (real, filterable) leaves in the same selection — this drops only the
  // group row entries, still clearing the leaves.
  const clearSelectedOrActiveCells = React.useCallback(() => {
    const selectedRows = table.getSelectedRowModel().rows.filter((row) => !row.getIsGrouped())
    const editableColumnIds = columnIds.filter((id) => isColumnEditable(id))
    let ops: { rowId: string; columnId: string; value: unknown }[] = []

    if (selectedRows.length > 0) {
      ops = selectedRows.flatMap((row) =>
        editableColumnIds.map((columnId) => ({ rowId: row.id, columnId, value: undefined })),
      )
    } else if (nav.activeCell && isCellEditable(nav.activeCell)) {
      ops = [{ rowId: nav.activeCell.rowId, columnId: nav.activeCell.columnId, value: undefined }]
    }

    if (ops.length === 0) return
    commitBatch(ops)
    toast(`Cleared ${ops.length} cell${ops.length === 1 ? "" : "s"}`)
  }, [table, columnIds, isColumnEditable, isCellEditable, nav.activeCell, commitBatch])

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
      handleKeyDownWithGroupExpand(e)
    },
    [nav, undo, redo, copy, paste, clearSelectedOrActiveCells, handleKeyDownWithGroupExpand],
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

  return {
    table,
    runtime,
    filterState,
    setFilterState,
    grouping: group.grouping,
    setGrouping: group.setGrouping,
    isGroupRow,
  }
}
