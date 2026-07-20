import { GripVertical, Rows3, SquareStack, Table2 } from "lucide-react"

export type WorksWithComponent =
  | "data-table"
  | "grouped-data-table"
  | "dimension-picker"
  | "table-fields"

const COMPONENTS: Record<
  WorksWithComponent,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  "data-table": { label: "Data Table", icon: Table2 },
  "grouped-data-table": { label: "Grouped Data Table", icon: Rows3 },
  "dimension-picker": { label: "Dimension Picker", icon: GripVertical },
  "table-fields": { label: "Table Fields", icon: SquareStack },
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
        const { label, icon: Icon } = COMPONENTS[id]
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
          >
            <Icon className="size-3" />
            {label}
          </span>
        )
      })}
    </div>
  )
}
