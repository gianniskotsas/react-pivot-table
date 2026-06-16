"use client"

import * as React from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Layers, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import type { DimensionDef } from "./types"
import { MultiSelectContent } from "./multi-select"

/** Pure reorder used on drag end. Returns a new array; unchanged if an id is missing. */
export function reorderGrouping(
  grouping: string[],
  activeId: string,
  overId: string,
): string[] {
  const oldIndex = grouping.indexOf(activeId)
  const newIndex = grouping.indexOf(overId)
  if (oldIndex === -1 || newIndex === -1) return grouping
  return arrayMove(grouping, oldIndex, newIndex)
}

type DimensionPickerProps = {
  dimensions: DimensionDef[]
  grouping: string[]
  onGroupingChange: (next: string[]) => void
}

function SortableDimension({
  dimension,
  onRemove,
}: {
  dimension: DimensionDef
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dimension.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm",
        isDragging && "opacity-70 shadow-sm",
      )}
      // attributes (incl. aria-roledescription="sortable") belong on the item
      // root so AT announces it when the item is focused; the handle gets only
      // the keyboard/pointer listeners.
      {...attributes}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-label={`Drag ${dimension.label}`}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="flex-1">{dimension.label}</span>
      <button
        type="button"
        aria-label={`Remove ${dimension.label}`}
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function DimensionPickerContent({
  dimensions,
  grouping,
  onGroupingChange,
}: DimensionPickerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const byId = React.useMemo(
    () => new Map(dimensions.map((d) => [d.id, d])),
    [dimensions],
  )

  const orderedSelected = React.useMemo(
    () =>
      grouping
        .map((id) => byId.get(id))
        .filter((d): d is DimensionDef => Boolean(d)),
    [grouping, byId],
  )

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      onGroupingChange(
        reorderGrouping(grouping, String(active.id), String(over.id)),
      )
    },
    [grouping, onGroupingChange],
  )

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Dimensions</p>
        <MultiSelectContent
          options={dimensions.map((d) => ({ label: d.label, value: d.id }))}
          selected={grouping}
          onChange={onGroupingChange}
        />
      </div>

      {orderedSelected.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Hierarchy (drag to reorder)
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={grouping}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {orderedSelected.map((dimension) => (
                  <SortableDimension
                    key={dimension.id}
                    dimension={dimension}
                    onRemove={() =>
                      onGroupingChange(grouping.filter((g) => g !== dimension.id))
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  )
}

export function DimensionPicker(props: DimensionPickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={(p) => (
          <Button {...p} variant="outline" size="sm" className="gap-2" />
        )}
      >
        <Layers className="size-4" />
        Group by
        {props.grouping.length > 0 && (
          <Badge variant="secondary">{props.grouping.length}</Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <DimensionPickerContent {...props} />
      </PopoverContent>
    </Popover>
  )
}
