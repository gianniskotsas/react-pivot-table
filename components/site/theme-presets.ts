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

/**
 * Compact seed → full variable set. A docs page is ~95% background, muted,
 * border, and radius — an accent-only preset is invisible on it (learned the
 * hard way). So every preset here shifts the SURFACES: tinted backgrounds,
 * border strength, radius from square to pillowy — differences that show on
 * every card, button, and table row, not just the two primary-colored pixels.
 */
type ModeSeed = {
  background: string
  foreground: string
  card: string
  primary: string
  primaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  border: string
  input: string
  sidebar: string
  sidebarAccent: string
  destructive: string
}

function modeVars(seed: ModeSeed, radius: string): ThemeVars {
  return {
    "--background": seed.background,
    "--foreground": seed.foreground,
    "--card": seed.card,
    "--card-foreground": seed.foreground,
    "--popover": seed.card,
    "--popover-foreground": seed.foreground,
    "--primary": seed.primary,
    "--primary-foreground": seed.primaryForeground,
    "--secondary": seed.muted,
    "--secondary-foreground": seed.foreground,
    "--muted": seed.muted,
    "--muted-foreground": seed.mutedForeground,
    "--accent": seed.accent,
    "--accent-foreground": seed.foreground,
    "--destructive": seed.destructive,
    "--border": seed.border,
    "--input": seed.input,
    "--ring": seed.primary,
    "--radius": radius,
    "--sidebar": seed.sidebar,
    "--sidebar-foreground": seed.foreground,
    "--sidebar-primary": seed.primary,
    "--sidebar-primary-foreground": seed.primaryForeground,
    "--sidebar-accent": seed.sidebarAccent,
    "--sidebar-accent-foreground": seed.foreground,
    "--sidebar-border": seed.border,
    "--sidebar-ring": seed.primary,
  }
}

const RED_LIGHT = "oklch(0.577 0.245 27.325)"
const RED_DARK = "oklch(0.704 0.191 22.216)"

export const THEME_PRESETS: ThemePreset[] = [
  // The site's own warm-paper + teal theme lives in globals.css; `{}` clears
  // every inline override so the stylesheet shows through untouched.
  { id: "default", label: "Kotsas (default)", swatch: "oklch(0.5 0.11 175)", light: {}, dark: {} },
  {
    // Brutalist: pure white/black, square corners, borders you can't miss.
    id: "mono",
    label: "Mono",
    swatch: "oklch(0.09 0 0)",
    light: modeVars(
      {
        background: "oklch(1 0 0)",
        foreground: "oklch(0.09 0 0)",
        card: "oklch(1 0 0)",
        primary: "oklch(0.09 0 0)",
        primaryForeground: "oklch(0.98 0 0)",
        muted: "oklch(0.94 0 0)",
        mutedForeground: "oklch(0.44 0 0)",
        accent: "oklch(0.91 0 0)",
        border: "oklch(0.82 0 0)",
        input: "oklch(0.82 0 0)",
        sidebar: "oklch(0.96 0 0)",
        sidebarAccent: "oklch(0.89 0 0)",
        destructive: RED_LIGHT,
      },
      "0rem",
    ),
    dark: modeVars(
      {
        background: "oklch(0.05 0 0)",
        foreground: "oklch(0.98 0 0)",
        card: "oklch(0.16 0 0)",
        primary: "oklch(0.98 0 0)",
        primaryForeground: "oklch(0.1 0 0)",
        muted: "oklch(0.23 0 0)",
        mutedForeground: "oklch(0.72 0 0)",
        accent: "oklch(0.26 0 0)",
        border: "oklch(1 0 0 / 24%)",
        input: "oklch(1 0 0 / 28%)",
        sidebar: "oklch(0.12 0 0)",
        sidebarAccent: "oklch(0.24 0 0)",
        destructive: RED_DARK,
      },
      "0rem",
    ),
  },
  {
    // Cool slate-blue neutrals with an indigo accent — the "SaaS dashboard".
    id: "slate",
    label: "Slate",
    swatch: "oklch(0.511 0.262 276.966)",
    light: modeVars(
      {
        background: "oklch(0.984 0.003 247.9)",
        foreground: "oklch(0.208 0.042 265.8)",
        card: "oklch(1 0 0)",
        primary: "oklch(0.511 0.262 276.966)",
        primaryForeground: "oklch(0.985 0 0)",
        muted: "oklch(0.955 0.009 250)",
        mutedForeground: "oklch(0.554 0.046 257.4)",
        accent: "oklch(0.929 0.013 255.5)",
        border: "oklch(0.9 0.016 253)",
        input: "oklch(0.9 0.016 253)",
        sidebar: "oklch(0.955 0.011 251)",
        sidebarAccent: "oklch(0.91 0.018 254)",
        destructive: RED_LIGHT,
      },
      "0.5rem",
    ),
    dark: modeVars(
      {
        background: "oklch(0.208 0.042 265.755)",
        foreground: "oklch(0.968 0.007 247.9)",
        card: "oklch(0.279 0.041 260.031)",
        primary: "oklch(0.673 0.182 276.935)",
        primaryForeground: "oklch(0.15 0.04 270)",
        muted: "oklch(0.31 0.04 260)",
        mutedForeground: "oklch(0.704 0.04 256.788)",
        accent: "oklch(0.372 0.044 257.287)",
        border: "oklch(0.9 0.02 260 / 18%)",
        input: "oklch(0.9 0.02 260 / 22%)",
        sidebar: "oklch(0.155 0.042 264.7)",
        sidebarAccent: "oklch(0.34 0.042 259)",
        destructive: RED_DARK,
      },
      "0.5rem",
    ),
  },
  {
    // Warm cream + orange, pillowy 1rem radius — maximum distance from Mono.
    id: "sunset",
    label: "Sunset",
    swatch: "oklch(0.646 0.222 41.116)",
    light: modeVars(
      {
        background: "oklch(0.985 0.018 90)",
        foreground: "oklch(0.28 0.06 40)",
        card: "oklch(0.998 0.008 95)",
        primary: "oklch(0.646 0.222 41.116)",
        primaryForeground: "oklch(0.98 0.01 90)",
        muted: "oklch(0.945 0.032 85)",
        mutedForeground: "oklch(0.52 0.07 55)",
        accent: "oklch(0.92 0.045 78)",
        border: "oklch(0.88 0.045 80)",
        input: "oklch(0.88 0.045 80)",
        sidebar: "oklch(0.955 0.028 88)",
        sidebarAccent: "oklch(0.905 0.05 80)",
        destructive: RED_LIGHT,
      },
      "1rem",
    ),
    dark: modeVars(
      {
        background: "oklch(0.17 0.025 45)",
        foreground: "oklch(0.95 0.02 85)",
        card: "oklch(0.22 0.03 50)",
        primary: "oklch(0.75 0.183 55.934)",
        primaryForeground: "oklch(0.18 0.05 50)",
        muted: "oklch(0.265 0.03 50)",
        mutedForeground: "oklch(0.7 0.045 60)",
        accent: "oklch(0.3 0.035 55)",
        border: "oklch(1 0.04 80 / 17%)",
        input: "oklch(1 0.04 80 / 21%)",
        sidebar: "oklch(0.125 0.02 45)",
        sidebarAccent: "oklch(0.28 0.033 52)",
        destructive: RED_DARK,
      },
      "1rem",
    ),
  },
  {
    // Deep greens on green-tinted paper — tonal, calm, clearly not gray.
    id: "forest",
    label: "Forest",
    swatch: "oklch(0.527 0.154 150.069)",
    light: modeVars(
      {
        background: "oklch(0.98 0.009 155)",
        foreground: "oklch(0.22 0.03 155)",
        card: "oklch(0.995 0.004 155)",
        primary: "oklch(0.527 0.154 150.069)",
        primaryForeground: "oklch(0.97 0.01 155)",
        muted: "oklch(0.94 0.02 155)",
        mutedForeground: "oklch(0.5 0.04 155)",
        accent: "oklch(0.91 0.028 155)",
        border: "oklch(0.88 0.024 155)",
        input: "oklch(0.88 0.024 155)",
        sidebar: "oklch(0.95 0.016 155)",
        sidebarAccent: "oklch(0.9 0.03 155)",
        destructive: RED_LIGHT,
      },
      "0.75rem",
    ),
    dark: modeVars(
      {
        background: "oklch(0.16 0.02 160)",
        foreground: "oklch(0.95 0.012 155)",
        card: "oklch(0.21 0.026 160)",
        primary: "oklch(0.792 0.209 151.711)",
        primaryForeground: "oklch(0.15 0.04 155)",
        muted: "oklch(0.255 0.028 158)",
        mutedForeground: "oklch(0.7 0.05 155)",
        accent: "oklch(0.29 0.032 158)",
        border: "oklch(0.95 0.03 155 / 16%)",
        input: "oklch(0.95 0.03 155 / 20%)",
        sidebar: "oklch(0.12 0.018 160)",
        sidebarAccent: "oklch(0.27 0.03 158)",
        destructive: RED_DARK,
      },
      "0.75rem",
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
