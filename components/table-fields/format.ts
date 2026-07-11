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

/**
 * Durations are stored as a number of seconds. Default display unit is minutes,
 * rendered as `m:ss`. The `hms` unit renders `h:mm:ss`.
 */
export function formatDuration(
  seconds: number,
  opts: { unit?: "minutes" | "hms" } = {},
): string {
  if (isBlank(seconds)) return ""
  const total = Math.max(0, Math.floor(seconds))
  if (opts.unit === "hms") {
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}
