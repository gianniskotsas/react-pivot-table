"use client"

import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { describeCondition } from "./filter-utils"
import type { FilterCondition, FilterDef } from "./types"

type FilterChipsProps = {
  conditions: FilterCondition[]
  filterDefs: FilterDef[]
  onRemove: (conditionId: string) => void
}

export function FilterChips({
  conditions,
  filterDefs,
  onRemove,
}: FilterChipsProps) {
  if (conditions.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {conditions.map((condition) => {
        const def = filterDefs.find((d) => d.id === condition.columnId)
        const label = describeCondition(condition, def)
        return (
          <Badge
            key={condition.id}
            variant="secondary"
            className="max-w-60 gap-1 pr-1"
          >
            <span className="truncate">{label}</span>
            <button
              type="button"
              aria-label={`Remove ${label}`}
              onClick={() => onRemove(condition.id)}
              className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        )
      })}
    </div>
  )
}
