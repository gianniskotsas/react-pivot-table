import { describe, expect, it } from "vitest"

import { parseThemeCss, THEME_PRESETS } from "./theme-presets"

describe("parseThemeCss", () => {
  it("parses a ui.shadcn.com/themes-style :root + .dark block", () => {
    const css = `
:root {
  --primary: oklch(0.6 0.2 300);
  --primary-foreground: oklch(0.98 0 0);
  --radius: 0.5rem;
}
.dark {
  --primary: oklch(0.7 0.18 300);
}
`
    const parsed = parseThemeCss(css)
    expect(parsed).not.toBeNull()
    expect(parsed!.light["--primary"]).toBe("oklch(0.6 0.2 300)")
    expect(parsed!.light["--radius"]).toBe("0.5rem")
    expect(parsed!.dark["--primary"]).toBe("oklch(0.7 0.18 300)")
  })

  it("treats a bare variable list (no selector) as :root", () => {
    const parsed = parseThemeCss("--primary: #4f46e5;\n--ring: #4f46e5;")
    expect(parsed).not.toBeNull()
    expect(parsed!.light["--primary"]).toBe("#4f46e5")
    expect(parsed!.dark).toEqual({})
  })

  it("handles hsl values with parens and extra whitespace", () => {
    const parsed = parseThemeCss(`:root { --primary:   hsl(222.2 47.4% 11.2%) ; }`)
    expect(parsed!.light["--primary"]).toBe("hsl(222.2 47.4% 11.2%)")
  })

  it("survives a tweakcn export that wraps blocks in @layer", () => {
    const css = `@layer base {\n:root {\n  --primary: oklch(0.5 0.1 100);\n}\n.dark {\n  --primary: oklch(0.6 0.1 100);\n}\n}`
    const parsed = parseThemeCss(css)
    expect(parsed!.light["--primary"]).toBe("oklch(0.5 0.1 100)")
    expect(parsed!.dark["--primary"]).toBe("oklch(0.6 0.1 100)")
  })

  it("returns null when nothing parseable is pasted", () => {
    expect(parseThemeCss("hello world")).toBeNull()
    expect(parseThemeCss("")).toBeNull()
  })
})

describe("THEME_PRESETS", () => {
  it("default preset is empty (clears overrides so the stylesheet shows through)", () => {
    const def = THEME_PRESETS.find((p) => p.id === "default")!
    expect(def.light).toEqual({})
    expect(def.dark).toEqual({})
  })

  it("every non-default preset defines both modes with matching var names", () => {
    for (const preset of THEME_PRESETS.filter((p) => p.id !== "default")) {
      expect(Object.keys(preset.light).sort()).toEqual(Object.keys(preset.dark).sort())
      expect(preset.light["--primary"]).toBeTruthy()
    }
  })
})
