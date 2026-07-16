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
