function isBlank(value: number): boolean {
  return value == null || Number.isNaN(value)
}

export function formatNumber(
  value: number,
  opts: { locale?: string; maximumFractionDigits?: number } = {},
): string {
  if (isBlank(value)) return ""
  return new Intl.NumberFormat(opts.locale ?? "en-US", {
    maximumFractionDigits: opts.maximumFractionDigits ?? 2,
  }).format(value)
}

export function formatCurrency(
  value: number,
  opts: { currency?: string; locale?: string } = {},
): string {
  if (isBlank(value)) return ""
  return new Intl.NumberFormat(opts.locale ?? "en-US", {
    style: "currency",
    currency: opts.currency ?? "USD",
  }).format(value)
}

export function formatPercent(
  value: number,
  opts: { locale?: string; maximumFractionDigits?: number } = {},
): string {
  if (isBlank(value)) return ""
  return new Intl.NumberFormat(opts.locale ?? "en-US", {
    style: "percent",
    maximumFractionDigits: opts.maximumFractionDigits ?? 1,
  }).format(value)
}

const DURATION_UNITS: [label: string, ms: number][] = [
  ["d", 86_400_000],
  ["h", 3_600_000],
  ["m", 60_000],
  ["s", 1_000],
  ["ms", 1],
]

/**
 * Humanizes a duration into compact units (e.g. `1h 30m`, `45s`, `2d 1h`,
 * `1s 500ms`), showing the two most-significant non-zero units. The stored
 * value's unit defaults to seconds; pass `{ unit: "ms" }` for milliseconds.
 */
export function formatDuration(
  value: number,
  opts: { unit?: "s" | "ms"; maxUnits?: number } = {},
): string {
  if (isBlank(value)) return ""
  let ms = opts.unit === "ms" ? value : value * 1000
  ms = Math.max(0, Math.round(ms))
  if (ms === 0) return "0s"

  const maxUnits = opts.maxUnits ?? 2
  const parts: string[] = []
  let remaining = ms
  for (const [label, size] of DURATION_UNITS) {
    if (parts.length >= maxUnits) break
    const qty = Math.floor(remaining / size)
    if (qty > 0) {
      parts.push(`${qty}${label}`)
      remaining -= qty * size
    }
  }
  return parts.join(" ")
}
