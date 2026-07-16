import { DocsBreadcrumb } from "@/components/site/docs-breadcrumb"
import { DocsSearch } from "@/components/site/docs-search"
import { GithubStars } from "@/components/site/github-stars"
import { ThemePresetPicker } from "@/components/site/theme-preset-picker"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function DocsHeader() {
  return (
    // rounded-t matches SidebarInset's rounded-xl card so the sticky header's
    // backdrop doesn't square off the card's top corners on md+.
    // px must stay in lockstep with the content wrapper in app/docs/layout.tsx
    // so the breadcrumb and the page title share a left edge.
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/60 bg-background/95 px-6 backdrop-blur-sm md:rounded-t-xl lg:px-8">
      {/* Desktop keeps the sidebar permanently open, so the toggle only exists
          on mobile, where the sidebar is a drawer that needs a way to open. */}
      <SidebarTrigger className="md:hidden" />
      <DocsBreadcrumb />
      <div className="flex flex-1 items-center justify-end gap-1">
        <DocsSearch />
        <GithubStars />
        <ThemePresetPicker />
        <ThemeToggle />
      </div>
    </header>
  )
}
