import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * grouped-data-table deliberately DUPLICATES several source files from
 * data-table so each registry item stays self-contained (`npx shadcn add`
 * of either one must not depend on the other). The per-family
 * primitives.parity.test.ts files only guard base-ui ↔ Radix drift WITHIN a
 * family — they can't see a fix landing in one family's copy and not the
 * other's (which happened: PopoverButtonTrigger gained a `disabled` prop in
 * data-table only). This test pins the duplicated files byte-for-byte across
 * families, so any future edit to one copy fails loudly until it's mirrored.
 *
 * types.ts and index.ts are deliberately NOT listed: each family's public
 * type surface and barrel legitimately differ (grouping vs selection/actions
 * features).
 */

const here = resolve(__dirname)
const sibling = resolve(__dirname, "../data-table")

const DUPLICATED_FILES = [
  "filter-utils.ts",
  "multi-select.tsx",
  "filter-builder.tsx",
  "primitives.tsx",
  "primitives.radix.tsx",
] as const

describe("cross-family duplicated-file parity (data-table ↔ grouped-data-table)", () => {
  it.each(DUPLICATED_FILES)(
    "`%s` is byte-identical in both families",
    (name) => {
      const ours = readFileSync(resolve(here, name), "utf8")
      const theirs = readFileSync(resolve(sibling, name), "utf8")
      expect(ours).toBe(theirs)
    },
  )
})

/**
 * types.ts as a whole legitimately differs (each family's props differ), but the
 * FilterType→FilterState block inside it is duplicated verbatim. Compare just
 * that region so a divergence in filter types fails as loudly as one in
 * filter-utils.ts.
 */
function extractFilterTypeBlock(src: string): string {
  const start = src.indexOf("export type FilterType")
  const endMarker = "export type FilterState"
  const end = src.indexOf("\n", src.indexOf(endMarker) + endMarker.length)
  if (start === -1 || end === -1) throw new Error("filter type block not found")
  return src.slice(start, end).trim()
}

describe("cross-family filter type parity (data-table ↔ grouped-data-table)", () => {
  it("declares an identical FilterType→FilterState block in both families", () => {
    const ours = readFileSync(resolve(here, "types.ts"), "utf8")
    const theirs = readFileSync(resolve(sibling, "types.ts"), "utf8")
    expect(extractFilterTypeBlock(ours)).toBe(extractFilterTypeBlock(theirs))
  })
})
