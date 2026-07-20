import { describe, expect, it } from "vitest"

import { buildGroupColumn } from "./group-column"
import { GROUP_COLUMN_ID } from "./types"

describe("buildGroupColumn", () => {
  it("has the expected id and structural column flags", () => {
    // Mirrors the equivalent structural-flags assertion for the row-gutter
    // column in row-gutter.test.tsx ("has the expected id and structural
    // column flags") — both are table-owned columns with no TData accessor,
    // so neither should be sortable, hideable, or pinnable.
    const column = buildGroupColumn<{ id: string }>({ header: "Deal" })
    expect(column.id).toBe(GROUP_COLUMN_ID)
    expect(column.enableSorting).toBe(false)
    expect(column.enableHiding).toBe(false)
    expect(column.enablePinning).toBe(false)
    // This is the auto-generated grouping column itself — grouping BY it
    // makes no sense (there's nothing to group), so it must not offer itself
    // up as a groupable dimension.
    expect(column.enableGrouping).toBe(false)
    // Defense in depth: nothing on the real nav/clipboard/bulk-clear paths
    // ever consults this today (they already exclude GROUP_COLUMN_ID
    // upstream), but meta.editable === false is what stops a structural,
    // no-accessor column from being misreported as editable to any caller
    // that asks isColumnEditable(GROUP_COLUMN_ID) directly.
    expect(column.meta).toMatchObject({ editable: false })
  })

  it("defaults to a 220px width wider than TanStack's generic 150px column default", () => {
    // Unlike a plain text column, this one carries a chevron plus
    // depth-dependent indentation on top of the label — 150px clips real
    // content almost immediately.
    const column = buildGroupColumn<{ id: string }>({ header: "Account" })
    expect(column.size).toBe(220)
  })

  it("honors an explicit size override", () => {
    const column = buildGroupColumn<{ id: string }>({ header: "Account", size: 320 })
    expect(column.size).toBe(320)
  })
})
