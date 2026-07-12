import { describe, expect, it } from "vitest"

import { gridToTsv, parseTsv, planPaste, type ClipboardColumn } from "./clipboard"

describe("parseTsv", () => {
  it("splits rows on newlines and cells on tabs", () => {
    expect(parseTsv("a\tb\nc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })

  it("normalizes \\r\\n and bare \\r line endings", () => {
    expect(parseTsv("a\tb\r\nc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
    expect(parseTsv("a\tb\rc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })

  it("a single cell (no tabs or newlines) parses as one row of one cell", () => {
    expect(parseTsv("hello")).toEqual([["hello"]])
  })

  it("drops exactly one trailing empty line (common when copying from a spreadsheet), but keeps interior blank lines", () => {
    expect(parseTsv("a\tb\nc\td\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
    expect(parseTsv("a\n\nb")).toEqual([["a"], [""], ["b"]])
  })
})

describe("gridToTsv", () => {
  const columns: ClipboardColumn[] = [
    { id: "name", toClipboard: (v) => String(v ?? "") },
    { id: "age", toClipboard: (v) => String(v ?? "") },
  ]

  it("joins cells with tabs and rows with newlines, running each value through its column's toClipboard", () => {
    const grid = [
      ["Bailey", 44],
      ["Ada", 30],
    ]
    expect(gridToTsv(grid, columns)).toBe("Bailey\t44\nAda\t30")
  })

  it("a single value (1x1 grid) serializes with no tabs or newlines", () => {
    expect(gridToTsv([["Bailey"]], [columns[0]])).toBe("Bailey")
  })
})

describe("planPaste", () => {
  const columns: ClipboardColumn[] = [
    { id: "name", toClipboard: (v) => String(v ?? ""), fromClipboard: (t) => t },
    {
      id: "age",
      toClipboard: (v) => String(v ?? ""),
      fromClipboard: (t) => {
        const n = Number(t)
        return Number.isFinite(n) ? n : undefined
      },
    },
  ]
  const rowIds = ["r1", "r2"]

  it("maps a parsed grid onto existing rows starting at the given position", () => {
    const plan = planPaste(
      [
        ["Baily", "45"],
        ["Adah", "31"],
      ],
      0,
      0,
      rowIds,
      columns,
    )
    expect(plan.updates).toEqual([
      { rowId: "r1", columnId: "name", value: "Baily" },
      { rowId: "r1", columnId: "age", value: 45 },
      { rowId: "r2", columnId: "name", value: "Adah" },
      { rowId: "r2", columnId: "age", value: 31 },
    ])
    expect(plan.newRows).toEqual([])
  })

  it("pastes starting at a non-zero column offset, only touching columns from there on", () => {
    const plan = planPaste([["45"]], 0, 1, rowIds, columns)
    expect(plan.updates).toEqual([{ rowId: "r1", columnId: "age", value: 45 }])
  })

  it("pastes with both row and column offsets non-zero at once", () => {
    const plan = planPaste([["31"]], 1, 1, rowIds, columns)
    expect(plan.updates).toEqual([{ rowId: "r2", columnId: "age", value: 31 }])
  })

  it("skips a cell whose column has no fromClipboard (read-only/unsupported column)", () => {
    const readOnlyColumns: ClipboardColumn[] = [
      { id: "name", toClipboard: (v) => String(v ?? "") }, // no fromClipboard
      columns[1],
    ]
    const plan = planPaste([["Baily", "45"]], 0, 0, rowIds, readOnlyColumns)
    expect(plan.updates).toEqual([{ rowId: "r1", columnId: "age", value: 45 }])
  })

  it("skips a cell whose text fails to parse (fromClipboard returns undefined), leaving that cell untouched", () => {
    const plan = planPaste([["Baily", "not a number"]], 0, 0, rowIds, columns)
    expect(plan.updates).toEqual([{ rowId: "r1", columnId: "name", value: "Baily" }])
  })

  it("rows past the end of rowIds are reported as newRows instead of updates", () => {
    const plan = planPaste(
      [
        ["Baily", "45"],
        ["Adah", "31"],
        ["Chris", "22"],
      ],
      0,
      0,
      rowIds, // only 2 existing rows
      columns,
    )
    expect(plan.updates).toEqual([
      { rowId: "r1", columnId: "name", value: "Baily" },
      { rowId: "r1", columnId: "age", value: 45 },
      { rowId: "r2", columnId: "name", value: "Adah" },
      { rowId: "r2", columnId: "age", value: 31 },
    ])
    expect(plan.newRows).toEqual([{ name: "Chris", age: 22 }])
  })

  it("a new row with every cell unparseable is not reported at all (an empty partial row is not useful)", () => {
    const plan = planPaste([["not a number"]], 0, 1, rowIds.slice(0, 0), columns) // no existing rows, only the "age" column, unparseable text
    expect(plan.newRows).toEqual([])
  })

  it("an overflow row with a mix of parseable and unparseable cells only includes the parseable keys", () => {
    const plan = planPaste([["Chris", "not a number"]], 2, 0, rowIds, columns) // rowIndex 2 is past rowIds' length (2)
    expect(plan.newRows).toEqual([{ name: "Chris" }])
  })
})
