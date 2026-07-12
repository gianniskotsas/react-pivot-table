import type { ReactNode } from "react"

import { DocsNav } from "@/components/site/docs-nav"
import { SiteHeader } from "@/components/site/site-header"

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-12 md:py-16">
        <aside className="hidden w-48 shrink-0 md:block">
          <div className="sticky top-20">
            <DocsNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
