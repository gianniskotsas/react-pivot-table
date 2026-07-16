"use client"

import * as React from "react"
import { Check, Paintbrush } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import {
  applyThemeVars,
  parseThemeCss,
  THEME_PRESETS,
  type ThemeVars,
} from "./theme-presets"

const PRESET_STORAGE_KEY = "kotsas-theme-preset"
const CUSTOM_STORAGE_KEY = "kotsas-theme-custom-css"

/**
 * Lets docs visitors preview every component under a different shadcn theme:
 * a handful of curated presets plus "paste your own" for a block generated on
 * ui.shadcn.com/themes or tweakcn.com. Preview-only by design — variables are
 * applied inline on <html> and persisted in localStorage; shipping the theme
 * for real means pasting the same block into the consumer's globals.css.
 */
export function ThemePresetPicker() {
  const { resolvedTheme } = useTheme()
  const [presetId, setPresetId] = React.useState("default")
  const [customCss, setCustomCss] = React.useState("")
  const [customVars, setCustomVars] = React.useState<{
    light: ThemeVars
    dark: ThemeVars
  } | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const [parseError, setParseError] = React.useState(false)

  // Restore the visitor's previous pick. localStorage is unreachable during
  // SSR, so this has to be a mount effect rather than a lazy initializer.
  React.useEffect(() => {
    const storedId = localStorage.getItem(PRESET_STORAGE_KEY)
    const storedCss = localStorage.getItem(CUSTOM_STORAGE_KEY)
    if (storedCss) {
      const parsed = parseThemeCss(storedCss)
      if (parsed) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating persisted client-only state
        setCustomCss(storedCss)
        setCustomVars(parsed)
      }
    }
    if (storedId) setPresetId(storedId)
  }, [])

  // Re-apply on every preset OR light/dark change: the vars land as inline
  // styles on <html>, which outrank both the :root and .dark stylesheet
  // rules — so the correct mode's set must be re-applied when the mode flips.
  React.useEffect(() => {
    if (!resolvedTheme) return
    const mode = resolvedTheme === "dark" ? "dark" : "light"
    if (presetId === "custom" && customVars) {
      applyThemeVars(customVars[mode], customVars)
      return
    }
    const preset = THEME_PRESETS.find((p) => p.id === presetId) ?? THEME_PRESETS[0]
    applyThemeVars(preset[mode], customVars)
  }, [presetId, customVars, resolvedTheme])

  function pickPreset(id: string) {
    setPresetId(id)
    localStorage.setItem(PRESET_STORAGE_KEY, id)
  }

  function applyCustom() {
    const parsed = parseThemeCss(draft)
    if (!parsed) {
      setParseError(true)
      return
    }
    setParseError(false)
    setCustomCss(draft)
    setCustomVars(parsed)
    setPresetId("custom")
    localStorage.setItem(CUSTOM_STORAGE_KEY, draft)
    localStorage.setItem(PRESET_STORAGE_KEY, "custom")
    setDialogOpen(false)
  }

  return (
    <>
      <Popover>
        <PopoverTrigger
          render={(p) => (
            <Button
              {...p}
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Preview a different theme"
            />
          )}
        >
          <Paintbrush className="size-4" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 p-2">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Preview theme
          </p>
          <div className="space-y-0.5">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => pickPreset(preset.id)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full border border-border/50"
                  style={{ backgroundColor: preset.swatch }}
                />
                {preset.label}
                {presetId === preset.id && <Check className="ml-auto size-4" aria-hidden="true" />}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setDraft(customCss)
                setParseError(false)
                setDialogOpen(true)
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <span
                aria-hidden
                className={cn(
                  "size-3 shrink-0 rounded-full border border-border/50",
                  "bg-[conic-gradient(oklch(0.65_0.2_20),oklch(0.65_0.2_140),oklch(0.55_0.22_265),oklch(0.65_0.2_20))]",
                )}
              />
              Custom…
              {presetId === "custom" && <Check className="ml-auto size-4" aria-hidden="true" />}
            </button>
          </div>
          <p className="border-t px-2 pt-2 pb-0.5 text-xs text-muted-foreground">
            Preview only — to ship a theme, paste it into your globals.css.
          </p>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Paste a custom theme</DialogTitle>
            <DialogDescription>
              Generate a theme on{" "}
              <a
                href="https://ui.shadcn.com/themes"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                ui.shadcn.com/themes
              </a>{" "}
              or{" "}
              <a
                href="https://tweakcn.com"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                tweakcn.com
              </a>
              , copy the CSS-variable block (the <code>:root</code> and{" "}
              <code>.dark</code> rules), and paste it here to preview every
              table in that theme.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={":root {\n  --primary: oklch(0.6 0.2 300);\n  …\n}\n.dark {\n  …\n}"}
            className="max-h-72 min-h-44 font-mono text-xs"
          />
          {parseError && (
            <p className="text-sm text-destructive">
              Couldn&apos;t find any CSS variables in that — paste the{" "}
              <code>:root</code>/<code>.dark</code> block exactly as the
              generator produced it.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyCustom} disabled={draft.trim() === ""}>
              Apply preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
