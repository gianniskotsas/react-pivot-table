import type { ReactNode } from "react"

import { DocsHeader } from "@/components/site/docs-header"
import { DocsPager } from "@/components/site/docs-pager"
import { DocsSidebar } from "@/components/site/docs-sidebar"
import { DocsToc } from "@/components/site/docs-toc"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DocsSidebar />
      {/* min-w-0 lets the inset shrink to the space left of the sidebar; without
          it a wide table (e.g. a frozen-column demo) forces the inset past the
          viewport and scrolls the whole page instead of its own container. */}
      <SidebarInset className="min-w-0">
        <DocsHeader />
        <div className="mx-auto flex w-full max-w-6xl gap-10 px-6 lg:px-8">
          <main id="docs-content" className="min-w-0 flex-1 py-10 md:py-14">
            {children}
            <DocsPager />
          </main>
          <DocsToc />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
