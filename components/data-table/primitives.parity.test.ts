import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The base-ui (`primitives.tsx`) and Radix (`primitives.radix.tsx`) builds of
 * the shim must expose an IDENTICAL public type surface. `primitives.radix.tsx`
 * is excluded from `tsc`, so a drifting prop would otherwise go unnoticed until
 * a Radix consumer's install fails to compile. This test fails loudly instead.
 */

const dir = resolve(__dirname)
const base = readFileSync(resolve(dir, "primitives.tsx"), "utf8")
const radix = readFileSync(resolve(dir, "primitives.radix.tsx"), "utf8")

function extractType(src: string, name: string): string {
  const match = src.match(new RegExp(`export type ${name} =[\\s\\S]*?(?=\\n\\n)`))
  if (!match) throw new Error(`export type ${name} not found`)
  return match[0].trim()
}

describe("data-table primitives variant parity", () => {
  it("exports an identical PopoverButtonTriggerProps type in both builds", () => {
    expect(extractType(radix, "PopoverButtonTriggerProps")).toBe(
      extractType(base, "PopoverButtonTriggerProps"),
    )
  })
})
