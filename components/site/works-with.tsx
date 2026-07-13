import Link from "next/link"
import { Rows3, SquareStack, Table2 } from "lucide-react"

export type WorksWithComponent =
  | "data-table"
  | "grouped-data-table"
  | "table-fields"

const COMPONENTS: Record<
  WorksWithComponent,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    href: string
  }
> = {
  "data-table": {
    label: "Data Table",
    icon: Table2,
    href: "/docs/components/data-table",
  },
  "grouped-data-table": {
    label: "Grouped Data Table",
    icon: Rows3,
    href: "/docs/components/grouped-data-table",
  },
  "table-fields": {
    label: "Table Fields",
    icon: SquareStack,
    href: "/docs/components/table-fields",
  },
}

export function WorksWith({
  components,
}: {
  components: WorksWithComponent[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span className="text-xs text-muted-foreground">Works with:</span>
      {components.map((id) => {
        const { label, icon: Icon, href } = COMPONENTS[id]
        return (
          <Link
            key={id}
            href={href}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <Icon className="size-3" />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
