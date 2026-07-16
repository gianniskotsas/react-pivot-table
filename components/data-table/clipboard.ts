/** A column's clipboard serialize/parse pair, as read off DataTableColumnMeta by the React-level copy/paste glue in use-data-table.ts. */
export type ClipboardColumn = {
  id: string
  toClipboard: (value: unknown) => string
  /** Absent (not just returning undefined) means this column can never be pasted into. */
  fromClipboard?: (text: string) => unknown
}

/**
 * Parses TSV text (as read from the clipboard) into a 2D grid of raw cell
 * strings. Normalizes \r\n and bare \r line endings to \n before parsing.
 * Quote-aware, matching what Excel/Sheets actually emit: a cell containing a
 * literal tab, newline, or quote is wrapped in double quotes (with embedded
 * quotes doubled), so a copied multi-line cell must land in ONE grid cell
 * rather than being naively split into phantom rows/columns. A quote only
 * opens quoted mode at the start of a field; mid-field quotes are literal
 * (also matching spreadsheet behavior). Drops exactly one trailing empty
 * line — pasting from Excel/Sheets always ends the copied block with a line
 * terminator, which would otherwise show up as one extra, entirely-empty row.
 */
export function parseTsv(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const rows: string[][] = [[]]
  let field = ""
  let fieldStarted = false // distinguishes "" (empty so far) from content beginning with a literal quote
  let inQuotes = false
  let i = 0
  while (i < normalized.length) {
    const ch = normalized[i]
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"' && !fieldStarted && field === "") {
      inQuotes = true
      fieldStarted = true
      i++
      continue
    }
    if (ch === "\t") {
      rows[rows.length - 1].push(field)
      field = ""
      fieldStarted = false
      i++
      continue
    }
    if (ch === "\n") {
      rows[rows.length - 1].push(field)
      rows.push([])
      field = ""
      fieldStarted = false
      i++
      continue
    }
    field += ch
    fieldStarted = true
    i++
  }
  rows[rows.length - 1].push(field)
  const last = rows[rows.length - 1]
  if (rows.length > 1 && last.length === 1 && last[0] === "") rows.pop()
  return rows
}

/** Quote-wraps a TSV field when it contains a tab, newline, or quote (doubling embedded quotes), as Excel/Sheets do — so a multi-line longText cell survives a copy→paste round-trip intact. */
function encodeTsvField(text: string): string {
  return /[\t\n\r"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * Serializes a rectangular grid of raw values into Excel/Sheets-pasteable
 * TSV, running each value through its column's toClipboard. `columns` must
 * be in the same left-to-right order as `grid`'s inner arrays.
 */
export function gridToTsv(grid: unknown[][], columns: ClipboardColumn[]): string {
  return grid
    .map((row) =>
      row.map((value, i) => encodeTsvField(columns[i]?.toClipboard(value) ?? "")).join("\t"),
    )
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
