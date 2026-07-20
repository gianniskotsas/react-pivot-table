import Link from "next/link"
import {
  ArrowRight,
  Columns3,
  Rows3,
  SquareStack,
  Table2,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SiteHeader } from "@/components/site/site-header"
import { GITHUB_URL } from "@/components/site/github-stars"
import { HeroCopyCommand } from "@/components/site/hero-copy-command"
import { HomeGroupedPreview } from "@/components/site/home-grouped-preview"
import { HomeDataTablePreview } from "@/components/site/home-datatable-preview"
import { HomeFieldsPreview } from "@/components/site/home-fields-preview"

const HERO_STATS = [
  { icon: SquareStack, label: "15 typed field types" },
  { icon: Rows3, label: "AG-Grid-style row grouping" },
  { icon: Undo2, label: "Undo/redo & clipboard" },
  { icon: Columns3, label: "Freeze, hide, resize columns" },
]

const SHOWCASE = [
  {
    href: "/docs/grouping",
    icon: Rows3,
    name: "Grouped Data Table",
    description:
      "AG-Grid-style row grouping, drag-and-drop dimensions, and AND/OR filters.",
    preview: <HomeGroupedPreview />,
  },
  {
    href: "/docs/sorting",
    icon: Table2,
    name: "Data Table",
    description:
      "A spreadsheet-style grid: selection, undo/redo, clipboard, and CSV export.",
    preview: <HomeDataTablePreview />,
  },
  {
    href: "/docs/field-types",
    icon: SquareStack,
    name: "Table Fields",
    description:
      "Fifteen Airtable-style field types — typed, formatted, and clipboard-aware.",
    preview: <HomeFieldsPreview />,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-svh">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Kotsas design system guideline: flat solid surfaces, no photography
            /illustration/gradient base layers — the only atmosphere effect is
            a very faint accent-tinted radial glow, used sparingly and never on
            component surfaces or tables. Accent (not primary) at ~8% peak. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_60%_55%_at_50%_0%,color-mix(in_oklch,var(--accent),transparent_92%),transparent)]"
        />

        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-14 pb-12 text-center sm:pt-20 md:pt-28">
          <Badge
            variant="secondary"
            className="rounded-full font-normal"
            render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
          >
            Open source · shadcn registry
          </Badge>
          <h1 className="max-w-2xl font-display text-4xl font-medium tracking-tight text-balance sm:text-5xl md:text-6xl">
            Data tables for <em className="italic">shadcn/ui</em>.
          </h1>
          <p className="max-w-lg text-balance text-muted-foreground md:text-lg">
            Copy-paste, typed table components built on TanStack Table —
            grouping, editing, selection, and every field type you need.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/docs" />}
            >
              Browse components
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
            >
              GitHub
            </Button>
          </div>
          <HeroCopyCommand
            command="npx shadcn@latest add @kotsas-ui/data-table"
            className="mt-1"
          />
        </div>

        {/* Hero visual — the grouped table is the flagship feature (row
            grouping, drag-and-drop dimensions, per-group aggregation), so it
            leads; the showcase grid below covers all three surfaces. Framed
            like ComponentPreview's canvas (dot grid, pointer-events-none,
            scaled) so it reads as a live product shot, not an interactive
            widget competing with the page for clicks/scroll.
            Hidden below md: the table's own columns don't reflow, so
            shrinking it to fit a phone-width card either clips columns or
            scales the text past legible — better to drop it there and let
            the stat list carry the hero on small screens. */}
        <div className="mx-auto max-w-5xl px-6 pb-16 md:pb-24">
          <div className="relative hidden overflow-hidden rounded-2xl border bg-card shadow-lg ring-1 ring-foreground/5 md:block">
            <div className="pointer-events-none h-[22rem] overflow-hidden bg-[radial-gradient(color-mix(in_oklch,var(--foreground),transparent_93%)_1px,transparent_1px)] bg-[size:16px_16px] p-6 lg:h-[26rem] lg:p-10">
              <div className="origin-top scale-[0.85] lg:scale-100">
                <HomeGroupedPreview />
              </div>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent"
            />
          </div>

          <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:mt-8 md:gap-x-8">
            {HERO_STATS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground/70" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-6">
        {/* Showcase */}
        <section className="grid gap-6 pb-24 md:grid-cols-3">
          {SHOWCASE.map(({ href, icon: Icon, name, description, preview }) => (
            <div
              key={href}
              className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
            >
              <div className="relative h-56 overflow-hidden bg-[radial-gradient(color-mix(in_oklch,var(--foreground),transparent_93%)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black_65%,transparent_100%)] bg-[size:14px_14px] p-4">
                {/* Table columns don't reflow, so a narrower single-column
                    mobile card needs a smaller scale than the md+ 3-up grid
                    to avoid clipping extra columns off the right edge. */}
                <div className="pointer-events-none origin-top-left scale-[0.68] sm:scale-[0.82]">
                  {preview}
                </div>
              </div>
              <div className="border-t p-5">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <h3 className="font-medium">{name}</h3>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                  View docs
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
              <Link
                href={href}
                className="absolute inset-0"
                aria-label={`View ${name} docs`}
              />
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>Kotsas UI</span>
          <span>
            Built with{" "}
            <a
              href="https://ui.shadcn.com"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              shadcn/ui
            </a>{" "}
            &amp; TanStack Table
          </span>
        </div>
      </footer>
    </div>
  )
}
