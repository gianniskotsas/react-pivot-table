import Link from "next/link"
import { ArrowRight, Rows3, SquareStack, Table2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SiteHeader } from "@/components/site/site-header"
import { HomeGroupedPreview } from "@/components/site/home-grouped-preview"
import { HomeDataTablePreview } from "@/components/site/home-datatable-preview"
import { HomeFieldsPreview } from "@/components/site/home-fields-preview"

const GITHUB_URL = "https://github.com/gianniskotsas/react-pivot-table"

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

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="relative flex flex-col items-center gap-6 py-24 text-center md:py-32">
          {/* Atmosphere: a teal glow anchored to the top edge plus a faint
              grain wash — the hero otherwise sits on a large flat void. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_60%_55%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_82%),transparent)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] dark:opacity-[0.07]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
            }}
          />
          <Badge variant="secondary" className="rounded-full font-normal">
            Open source · shadcn registry
          </Badge>
          <h1 className="max-w-2xl font-display text-5xl font-medium tracking-tight text-balance md:text-6xl">
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
        </section>

        {/* Showcase */}
        <section className="grid gap-6 pb-24 md:grid-cols-3">
          {SHOWCASE.map(({ href, icon: Icon, name, description, preview }) => (
            <div
              key={href}
              className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
            >
              <div className="relative h-56 overflow-hidden bg-[radial-gradient(color-mix(in_oklch,var(--foreground),transparent_93%)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black_65%,transparent_100%)] bg-[size:14px_14px] p-4">
                <div className="pointer-events-none origin-top-left scale-[0.82]">
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
