/** A column's export label + serializer, as read off DataTableColumnMeta by the React-level export glue in data-table.tsx. */
export type CsvColumn = { id: string; label: string; toClipboard: (value: unknown) => string }

// CSV/Excel formula injection (CWE-1236): a field starting with =, +, -, or
// @ is executed as a formula by Excel/Sheets/LibreOffice on open, not shown
// as plain text — a real risk for a feature whose whole purpose is producing
// a file the user opens in a spreadsheet app. Prefixing with a single quote
// is the standard OWASP-documented mitigation: spreadsheet apps treat a
// leading `'` as "force text," so the cell displays literally instead of
// evaluating, while non-spreadsheet CSV consumers (this module's own
// `exportCsv` tests, any other parser) just see the extra leading character
// as part of the field's plain text. Checked BEFORE quote-escaping below,
// since the prefix itself never contains a comma/quote/newline and so never
// needs quoting on its own account.
function neutralizeFormulaPrefix(field: string): string {
  return /^[=+\-@]/.test(field) ? `'${field}` : field
}

// RFC 4180: quote a field if it contains the delimiter, a quote, or a line
// break; a literal quote inside a quoted field is escaped by doubling it.
function escapeCsvField(field: string): string {
  const safe = neutralizeFormulaPrefix(field)
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`
  return safe
}

/**
 * Builds a CSV string (CRLF line endings, RFC 4180 quoting) from plain
 * row-value records, running each value through its column's toClipboard —
 * the same formatting copy/paste uses, so an exported number/currency/date
 * cell reads the same as what a user would see if they copied it.
 */
export function exportCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const header = columns.map((c) => escapeCsvField(c.label))
  const body = rows.map((row) => columns.map((c) => escapeCsvField(c.toClipboard(row[c.id]))))
  return [header, ...body].map((line) => line.join(",")).join("\r\n")
}

/**
 * Triggers a browser file download of `csv` as `filename` via a throwaway
 * object URL + anchor click. Pure DOM plumbing, not unit-tested the same way
 * as exportCsv above (jsdom has no real download pipeline to assert
 * against) — verified in a later task's manual browser check instead.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
