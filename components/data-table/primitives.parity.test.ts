import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The base-ui (`primitives.tsx`) and Radix (`primitives.radix.tsx`) builds of the
 * shim must expose an IDENTICAL public type surface so every caller compiles
 * against either variant. `primitives.radix.tsx` is excluded from `tsc` (via the
 * tsconfig exclude glob for radix files), so a drifting prop name/type/optionality
 * would otherwise go unnoticed until a Radix consumer's install fails to compile.
 * This test fails loudly the moment the two exported type blocks diverge.
 */

const dir = resolve(__dirname)
const base = readFileSync(resolve(dir, "primitives.tsx"), "utf8")
const radix = readFileSync(resolve(dir, "primitives.radix.tsx"), "utf8")

const EXPORTED_TYPES = [
  "SelectOption",
  "FieldSelectProps",
  "PopoverButtonTriggerProps",
] as const

/** Extract an `export type NAME = …` declaration up to the next blank line. */
function extractType(src: string, name: string): string {
  const match = src.match(new RegExp(`export type ${name} =[\\s\\S]*?(?=\\n\\n)`))
  if (!match) throw new Error(`export type ${name} not found`)
  return match[0].trim()
}

describe("data-table primitives variant parity", () => {
  it.each(EXPORTED_TYPES)(
    "exports an identical `%s` type in both the base-ui and Radix builds",
    (name) => {
      expect(extractType(radix, name)).toBe(extractType(base, name))
    },
  )
})
