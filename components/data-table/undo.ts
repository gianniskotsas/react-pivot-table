/** One cell's before/after value, as reported to the undo stack at the moment it changed. */
export type CellEdit = { rowId: string; columnId: string; prev: unknown; next: unknown }

/**
 * One or more CellEdits that undo/redo together atomically — a single edit
 * is a one-element batch; a paste or bulk-clear is a multi-element batch, so
 * one Ctrl+Z undoes the whole operation, not one cell at a time.
 */
export type UndoBatch = CellEdit[]

export type UndoStack = {
  /** Records a batch as the next undoable step. A new push always clears any pending redo — see the "branching history" test above. Empty batches are ignored. */
  push: (batch: UndoBatch) => void
  /** Pops and returns the most recent batch (the caller applies each edit's `prev`), or null if there's nothing to undo. */
  undo: () => UndoBatch | null
  /** Pops and returns the most recently undone batch (the caller applies each edit's `next`), or null if there's nothing to redo. */
  redo: () => UndoBatch | null
  canUndo: () => boolean
  canRedo: () => boolean
  /** Empties both stacks — not currently called by use-data-table.ts, but exposed for a future "data prop changed out from under us" reset, mirroring the isAllMatchingSelected reconciliation added in Plan 3. */
  clear: () => void
}

/**
 * Plain, React-free history stack. `maxSize` bounds memory on a long editing
 * session — the oldest batch is silently dropped once the cap is exceeded,
 * same convention as most spreadsheet undo stacks (no error, no toast; a
 * user editing 100+ cells in one session and going back further than that
 * is an extreme edge case, not a correctness concern worth surfacing).
 */
export function createUndoStack(maxSize = 100): UndoStack {
  let past: UndoBatch[] = []
  let future: UndoBatch[] = []

  return {
    push(batch) {
      if (batch.length === 0) return
      past.push(batch)
      if (past.length > maxSize) past.shift()
      future = []
    },
    undo() {
      const batch = past.pop()
      if (!batch) return null
      future.push(batch)
      return batch
    },
    redo() {
      const batch = future.pop()
      if (!batch) return null
      past.push(batch)
      return batch
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear() {
      past = []
      future = []
    },
  }
}
