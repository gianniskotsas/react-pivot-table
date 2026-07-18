"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { DOCS_GROUPS } from "@/components/site/docs-links"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <Link
          href="/"
          className="flex items-center gap-2 px-2 py-1.5 font-display text-sm font-medium tracking-tight"
        >
          <span
            aria-hidden
            className="grid size-5 place-items-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground"
          >
            K
          </span>
          Kotsas UI
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {DOCS_GROUPS.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
