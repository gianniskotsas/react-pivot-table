import { describe, expect, it } from "vitest"

import { exportCsv, type CsvColumn } from "./export-csv"

const COLUMNS: CsvColumn[] = [
  { id: "name", label: "Name", toClipboard: (v) => String(v ?? "") },
  { id: "age", label: "Age", toClipboard: (v) => String(v ?? "") },
]

describe("exportCsv", () => {
  it("produces a header row from column labels, then one row per record, CRLF-joined", () => {
    const csv = exportCsv(
      [
        { name: "Bailey", age: 44 },
        { name: "Ada", age: 30 },
      ],
      COLUMNS,
    )
    expect(csv).toBe("Name,Age\r\nBailey,44\r\nAda,30")
  })

  it("an empty rows array produces just the header row", () => {
    expect(exportCsv([], COLUMNS)).toBe("Name,Age")
  })

  it("quotes a field containing a comma", () => {
    const csv = exportCsv([{ name: "Smith, Bailey", age: 44 }], COLUMNS)
    expect(csv).toBe('Name,Age\r\n"Smith, Bailey",44')
  })

  it("quotes a field containing a double quote, doubling the internal quote (RFC 4180)", () => {
    const csv = exportCsv([{ name: 'Bailey "The Kid"', age: 44 }], COLUMNS)
    expect(csv).toBe('Name,Age\r\n"Bailey ""The Kid""",44')
  })

  it("quotes a field containing a newline", () => {
    const csv = exportCsv([{ name: "Bailey\nJr", age: 44 }], COLUMNS)
    expect(csv).toBe('Name,Age\r\n"Bailey\nJr",44')
  })

  it("a missing value for a column serializes via toClipboard(undefined), typically an empty string", () => {
    const csv = exportCsv([{ name: "Bailey" }], COLUMNS) // no "age" key at all
    expect(csv).toBe("Name,Age\r\nBailey,")
  })

  it("quotes once and doubles the internal quote when a field needs quoting for multiple reasons at once (comma AND quote)", () => {
    const csv = exportCsv([{ name: 'Smith, "Bailey"', age: 44 }], COLUMNS)
    expect(csv).toBe('Name,Age\r\n"Smith, ""Bailey""",44')
  })

  it("escapes the header row the same way as body cells when a column label itself needs quoting", () => {
    const columns: CsvColumn[] = [
      { id: "name", label: "Full, Name", toClipboard: (v) => String(v ?? "") },
      { id: "age", label: "Age", toClipboard: (v) => String(v ?? "") },
    ]
    const csv = exportCsv([{ name: "Bailey", age: 44 }], columns)
    expect(csv).toBe('"Full, Name",Age\r\nBailey,44')
  })

  it("prefixes a field starting with =, +, -, or @ with a single quote to prevent CSV/Excel formula injection (CWE-1236)", () => {
    const csv = exportCsv(
      [
        { name: "=cmd|'/c calc'!A1", age: 1 },
        { name: "+1+1", age: 2 },
        { name: "-1", age: 3 },
        { name: "@SUM(A1)", age: 4 },
      ],
      COLUMNS,
    )
    expect(csv).toBe(
      [
        "Name,Age",
        "'=cmd|'/c calc'!A1,1",
        "'+1+1,2",
        "'-1,3",
        "'@SUM(A1),4",
      ].join("\r\n"),
    )
  })

  it("does not prefix a field that merely contains (but doesn't start with) a formula-trigger character", () => {
    const csv = exportCsv([{ name: "a=b", age: 1 }], COLUMNS)
    expect(csv).toBe("Name,Age\r\na=b,1")
  })
})
