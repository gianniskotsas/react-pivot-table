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
  })
})
