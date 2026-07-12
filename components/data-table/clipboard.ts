/** A column's clipboard serialize/parse pair, as read off DataTableColumnMeta by the React-level copy/paste glue in use-data-table.ts. */
export type ClipboardColumn = {
  id: string
  toClipboard: (value: unknown) => string
  /** Absent (not just returning undefined) means this column can never be pasted into. */
  fromClipboard?: (text: string) => unknown
}

/**
 * Parses TSV text (as read from the clipboard) into a 2D grid of raw cell
 * strings. Normalizes \r\n and bare \r line endings to \n before splitting.
 * Drops exactly one trailing empty line — pasting from Excel/Sheets always
 * ends the copied block with a line terminator, which would otherwise show
 * up as one extra, entirely-empty row here.
 */
export function parseTsv(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop()
  return lines.map((line) => line.split("\t"))
}

/**
 * Serializes a rectangular grid of raw values into Excel/Sheets-pasteable
 * TSV, running each value through its column's toClipboard. `columns` must
 * be in the same left-to-right order as `grid`'s inner arrays.
 */
export function gridToTsv(grid: unknown[][], columns: ClipboardColumn[]): string {
  return grid
    .map((row) => row.map((value, i) => columns[i]?.toClipboard(value) ?? "").join("\t"))
    .join("\n")
}

export type PastePlan<TData> = {
  /** Writes to existing rows — hand to DataTableRuntime's internal commitBatch. */
  updates: { rowId: string; columnId: string; value: unknown }[]
  /** Rows the pasted block extends past the last existing row — hand to onCreateRows. */
  newRows: Partial<TData>[]
}

/**
 * Maps a parsed TSV grid onto the table starting at (startRowIndex,
 * startColIndex) in on-screen row/column order. A cell is skipped (neither
 * an update nor part of a new row) when its target column has no
 * fromClipboard at all, or when fromClipboard returns undefined for that
 * cell's text (unparseable) — "skip, don't apply" matches the read-only
 * gate's existing "cells stay copyable but never edit-affected when not
 * editable" principle, applied per-cell across the pasted block.
 */
export function planPaste<TData>(
  parsedGrid: string[][],
  startRowIndex: number,
  startColIndex: number,
  rowIds: string[],
  columns: ClipboardColumn[],
): PastePlan<TData> {
  const updates: PastePlan<TData>["updates"] = []
  const newRows: Partial<TData>[] = []

  parsedGrid.forEach((line, rOffset) => {
    const rowIndex = startRowIndex + rOffset
    const rowId: string | undefined = rowIds[rowIndex]
    const partial: Record<string, unknown> = {}
    let hasAny = false

    line.forEach((cellText, cOffset) => {
      const column = columns[startColIndex + cOffset]
      if (!column?.fromClipboard) return
      const value = column.fromClipboard(cellText)
      if (value === undefined) return
      if (rowId) {
        updates.push({ rowId, columnId: column.id, value })
      } else {
        partial[column.id] = value
        hasAny = true
      }
    })

    if (!rowId && hasAny) newRows.push(partial as Partial<TData>)
  })

  return { updates, newRows }
}
