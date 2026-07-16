import { DocsSearch } from "@/components/site/docs-search"
import { GithubStars } from "@/components/site/github-stars"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function DocsHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/60 bg-background/95 px-4 backdrop-blur-sm">
      {/* Desktop keeps the sidebar permanently open, so the toggle only exists
          on mobile, where the sidebar is a drawer that needs a way to open. */}
      <SidebarTrigger className="md:hidden" />
      <div className="flex flex-1 items-center justify-end gap-1">
        <DocsSearch />
        <GithubStars />
        <ThemeToggle />
      </div>
    </header>
  )
}
