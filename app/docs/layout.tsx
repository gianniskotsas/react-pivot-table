import type { ReactNode } from "react"

import { DocsHeader } from "@/components/site/docs-header"
import { DocsSidebar } from "@/components/site/docs-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DocsSidebar />
      <SidebarInset>
        <DocsHeader />
        <main className="mx-auto w-full max-w-4xl min-w-0 flex-1 px-6 py-10 md:py-14">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
