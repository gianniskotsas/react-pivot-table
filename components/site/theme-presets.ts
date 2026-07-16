/**
 * Runtime theme presets for the docs site.
 *
 * Every component in this registry styles itself exclusively through shadcn's
 * CSS variables, so "theming" is nothing more than swapping variable values.
 * These presets (and the paste-your-own parser below) apply a variable set as
 * inline custom properties on <html> — a pure preview mechanism for visitors.
 * Shipping a theme for real means pasting the same block into globals.css,
 * exactly as ui.shadcn.com/themes and tweakcn.com instruct.
 */

export type ThemeVars = Record<string, string>

export type ThemePreset = {
  id: string
  label: string
  /** Swatch color shown in the picker (the preset's light-mode primary). */
  swatch: string
  light: ThemeVars
  dark: ThemeVars
}

// shadcn's stock neutral scale — the base every color preset builds on.
const NEUTRAL_LIGHT: ThemeVars = {
  "--background": "oklch(1 0 0)",
  "--foreground": "oklch(0.145 0 0)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.145 0 0)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.145 0 0)",
  "--primary": "oklch(0.205 0 0)",
  "--primary-foreground": "oklch(0.985 0 0)",
  "--secondary": "oklch(0.97 0 0)",
  "--secondary-foreground": "oklch(0.205 0 0)",
  "--muted": "oklch(0.97 0 0)",
  "--muted-foreground": "oklch(0.556 0 0)",
  "--accent": "oklch(0.97 0 0)",
  "--accent-foreground": "oklch(0.205 0 0)",
  "--destructive": "oklch(0.577 0.245 27.325)",
  "--border": "oklch(0.922 0 0)",
  "--input": "oklch(0.922 0 0)",
  "--ring": "oklch(0.708 0 0)",
  "--sidebar": "oklch(0.965 0 0)",
  "--sidebar-foreground": "oklch(0.145 0 0)",
  "--sidebar-primary": "oklch(0.205 0 0)",
  "--sidebar-primary-foreground": "oklch(0.985 0 0)",
  "--sidebar-accent": "oklch(0.92 0 0)",
  "--sidebar-accent-foreground": "oklch(0.205 0 0)",
  "--sidebar-border": "oklch(0.922 0 0)",
  "--sidebar-ring": "oklch(0.708 0 0)",
}

const NEUTRAL_DARK: ThemeVars = {
  "--background": "oklch(0.145 0 0)",
  "--foreground": "oklch(0.985 0 0)",
  "--card": "oklch(0.205 0 0)",
  "--card-foreground": "oklch(0.985 0 0)",
  "--popover": "oklch(0.205 0 0)",
  "--popover-foreground": "oklch(0.985 0 0)",
  "--primary": "oklch(0.922 0 0)",
  "--primary-foreground": "oklch(0.205 0 0)",
  "--secondary": "oklch(0.269 0 0)",
  "--secondary-foreground": "oklch(0.985 0 0)",
  "--muted": "oklch(0.269 0 0)",
  "--muted-foreground": "oklch(0.708 0 0)",
  "--accent": "oklch(0.269 0 0)",
  "--accent-foreground": "oklch(0.985 0 0)",
  "--destructive": "oklch(0.704 0.191 22.216)",
  "--border": "oklch(1 0 0 / 16%)",
  "--input": "oklch(1 0 0 / 20%)",
  "--ring": "oklch(0.556 0 0)",
  "--sidebar": "oklch(0.1 0 0)",
  "--sidebar-foreground": "oklch(0.985 0 0)",
  "--sidebar-primary": "oklch(0.922 0 0)",
  "--sidebar-primary-foreground": "oklch(0.205 0 0)",
  "--sidebar-accent": "oklch(0.269 0 0)",
  "--sidebar-accent-foreground": "oklch(0.985 0 0)",
  "--sidebar-border": "oklch(1 0 0 / 16%)",
  "--sidebar-ring": "oklch(0.556 0 0)",
}

/** A neutral base recolored with an accent primary/ring, per mode. */
function accented(
  light: { primary: string; primaryForeground: string },
  dark: { primary: string; primaryForeground: string },
): { light: ThemeVars; dark: ThemeVars } {
  return {
    light: {
      ...NEUTRAL_LIGHT,
      "--primary": light.primary,
      "--primary-foreground": light.primaryForeground,
      "--ring": light.primary,
      "--sidebar-primary": light.primary,
      "--sidebar-primary-foreground": light.primaryForeground,
      "--sidebar-ring": light.primary,
    },
    dark: {
      ...NEUTRAL_DARK,
      "--primary": dark.primary,
      "--primary-foreground": dark.primaryForeground,
      "--ring": dark.primary,
      "--sidebar-primary": dark.primary,
      "--sidebar-primary-foreground": dark.primaryForeground,
      "--sidebar-ring": dark.primary,
    },
  }
}

export const THEME_PRESETS: ThemePreset[] = [
  // The site's own warm-paper + teal theme lives in globals.css; `{}` clears
  // every inline override so the stylesheet shows through untouched.
  { id: "default", label: "Kotsas (default)", swatch: "oklch(0.5 0.11 175)", light: {}, dark: {} },
  { id: "neutral", label: "Neutral", swatch: "oklch(0.205 0 0)", light: NEUTRAL_LIGHT, dark: NEUTRAL_DARK },
  {
    id: "blue",
    label: "Blue",
    swatch: "oklch(0.546 0.245 262.881)",
    ...accented(
      { primary: "oklch(0.546 0.245 262.881)", primaryForeground: "oklch(0.985 0 0)" },
      { primary: "oklch(0.623 0.214 259.815)", primaryForeground: "oklch(0.985 0 0)" },
    ),
  },
  {
    id: "violet",
    label: "Violet",
    swatch: "oklch(0.541 0.281 293.009)",
    ...accented(
      { primary: "oklch(0.541 0.281 293.009)", primaryForeground: "oklch(0.985 0 0)" },
      { primary: "oklch(0.606 0.25 292.717)", primaryForeground: "oklch(0.985 0 0)" },
    ),
  },
  {
    id: "rose",
    label: "Rose",
    swatch: "oklch(0.645 0.246 16.439)",
    ...accented(
      { primary: "oklch(0.645 0.246 16.439)", primaryForeground: "oklch(0.985 0 0)" },
      { primary: "oklch(0.645 0.246 16.439)", primaryForeground: "oklch(0.985 0 0)" },
    ),
  },
]

/**
 * Parses a theme block as exported by ui.shadcn.com/themes or tweakcn.com —
 * a `:root { --var: value; }` block plus an optional `.dark { ... }` block.
 * Bare `--var: value;` lines with no selector are treated as :root (some
 * generators emit only the variable list). Returns null when nothing that
 * looks like a CSS custom property can be found.
 */
export function parseThemeCss(css: string): { light: ThemeVars; dark: ThemeVars } | null {
  const grabVars = (block: string): ThemeVars => {
    const vars: ThemeVars = {}
    for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);?/g)) {
      vars[match[1]] = match[2].trim()
    }
    return vars
  }

  const blockFor = (selectorRe: RegExp): string | null => {
    const match = css.match(selectorRe)
    if (!match || match.index === undefined) return null
    const open = css.indexOf("{", match.index)
    if (open === -1) return null
    let depth = 0
    for (let i = open; i < css.length; i++) {
      if (css[i] === "{") depth++
      else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i)
    }
    return null
  }

  const rootBlock = blockFor(/:root\b/)
  const darkBlock = blockFor(/\.dark\b/)

  const light = grabVars(rootBlock ?? (darkBlock === null ? css : ""))
  const dark = darkBlock !== null ? grabVars(darkBlock) : {}

  if (Object.keys(light).length === 0 && Object.keys(dark).length === 0) return null
  // A dark-only paste still works: dark vars apply in dark mode, light mode
  // falls back to the stylesheet.
  return { light, dark }
}

/** Every var name any preset touches — the superset that must be cleared before applying a new set, so a preset that omits a var falls back to the stylesheet instead of inheriting the previous preset's leftover. */
function knownVars(custom?: { light: ThemeVars; dark: ThemeVars } | null): string[] {
  const names = new Set<string>()
  for (const preset of THEME_PRESETS) {
    for (const key of [...Object.keys(preset.light), ...Object.keys(preset.dark)]) names.add(key)
  }
  if (custom) {
    for (const key of [...Object.keys(custom.light), ...Object.keys(custom.dark)]) names.add(key)
  }
  return [...names]
}

/**
 * Applies one mode's variable set as inline custom properties on <html>.
 * Inline styles outrank both the :root and .dark stylesheet rules, which is
 * why the caller must re-invoke this whenever the light/dark mode flips —
 * see ThemePresetPicker's effect.
 */
export function applyThemeVars(
  vars: ThemeVars,
  custom?: { light: ThemeVars; dark: ThemeVars } | null,
): void {
  const root = document.documentElement
  for (const name of knownVars(custom)) root.style.removeProperty(name)
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)
}
