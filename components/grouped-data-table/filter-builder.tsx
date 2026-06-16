"use client"

import * as React from "react"
import { Filter, Plus, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  createCondition,
  operatorsForDef,
  OPERATOR_LABELS,
  removeCondition,
  replaceCondition,
  withColumn,
  withOperator,
  withValue,
} from "./filter-utils"
import type {
  FilterCondition,
  FilterDef,
  FilterOperator,
  FilterValue,
} from "./types"

type FilterBuilderProps = {
  filterableColumns: FilterDef[]
  conditions: FilterCondition[]
  onConditionsChange: (next: FilterCondition[]) => void
}

function defFor(columns: FilterDef[], columnId: string): FilterDef | undefined {
  return columns.find((d) => d.id === columnId)
}

function ConditionValueInput({
  def,
  condition,
  onValueChange,
}: {
  def: FilterDef
  condition: FilterCondition
  onValueChange: (value: FilterValue) => void
}) {
  const ariaLabel = `Filter value for ${def.label}`
  const op = condition.operator

  if (def.type === "select" && def.options && def.options.length > 0) {
    if (op === "isAnyOf") {
      const selected = Array.isArray(condition.value)
        ? (condition.value as string[])
        : []
      return (
        <div className="flex flex-col gap-1" aria-label={ariaLabel} role="group">
          {def.options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={(checked) =>
                  onValueChange(
                    checked === true
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value),
                  )
                }
              />
              {opt.label}
            </label>
          ))}
        </div>
      )
    }
    return (
      <Select
        value={condition.value == null ? "" : String(condition.value)}
        onValueChange={(v) => onValueChange((v ?? "") as FilterValue)}
      >
        <SelectTrigger aria-label={ariaLabel} className="h-8 w-full">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {def.options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (op === "between" || op === "dateBetween") {
    // Range pairs are stored as a 2-element string[] (inputs emit strings;
    // evaluateCondition coerces with Number()/Date()). string[] is a valid
    // FilterValue, so no cast is needed.
    const pair = Array.isArray(condition.value)
      ? condition.value.map((v) => String(v ?? ""))
      : ["", ""]
    const inputType = def.type === "date" ? "date" : "number"
    return (
      <div className="flex items-center gap-1">
        <Input
          type={inputType}
          aria-label={`${ariaLabel} from`}
          className="h-8"
          value={pair[0] ?? ""}
          onChange={(e) => onValueChange([e.target.value, pair[1] ?? ""])}
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type={inputType}
          aria-label={`${ariaLabel} to`}
          className="h-8"
          value={pair[1] ?? ""}
          onChange={(e) => onValueChange([pair[0] ?? "", e.target.value])}
        />
      </div>
    )
  }

  const inputType =
    def.type === "number" ? "number" : def.type === "date" ? "date" : "text"
  return (
    <Input
      type={inputType}
      aria-label={ariaLabel}
      className="h-8"
      value={condition.value == null ? "" : String(condition.value)}
      onChange={(e) => onValueChange(e.target.value)}
    />
  )
}

export function FilterBuilderContent({
  filterableColumns,
  conditions,
  onConditionsChange,
}: FilterBuilderProps) {
  function addCondition() {
    onConditionsChange([
      ...conditions,
      createCondition(filterableColumns, crypto.randomUUID()),
    ])
  }

  function update(next: FilterCondition) {
    onConditionsChange(replaceCondition(conditions, next))
  }

  // Nothing to build without at least one filterable column.
  if (filterableColumns.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Filters</p>

      {conditions.length === 0 && (
        <p className="text-sm text-muted-foreground">No filters applied.</p>
      )}

      <div className="space-y-2">
        {conditions.map((condition) => {
          const def =
            defFor(filterableColumns, condition.columnId) ?? filterableColumns[0]
          const operators = operatorsForDef(def)
          return (
            <div key={condition.id} className="flex items-start gap-1.5">
              <Select
                value={condition.columnId}
                onValueChange={(v) =>
                  v != null && update(withColumn(condition, String(v), filterableColumns))
                }
              >
                <SelectTrigger aria-label="Filter column" className="h-8 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterableColumns.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={condition.operator}
                onValueChange={(v) =>
                  v != null && update(withOperator(condition, v as FilterOperator))
                }
              >
                <SelectTrigger aria-label="Filter operator" className="h-8 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op} value={op}>
                      {OPERATOR_LABELS[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex-1">
                <ConditionValueInput
                  def={def}
                  condition={condition}
                  onValueChange={(value) => update(withValue(condition, value))}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove filter"
                onClick={() =>
                  onConditionsChange(removeCondition(conditions, condition.id))
                }
              >
                <X className="size-4" />
              </Button>
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={addCondition}
      >
        <Plus className="size-4" />
        Add filter
      </Button>
    </div>
  )
}

export function FilterPopover(props: FilterBuilderProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={(p) => (
          <Button {...p} variant="outline" size="sm" className="gap-2" />
        )}
      >
        <Filter className="size-4" />
        Filters
        {props.conditions.length > 0 && (
          <Badge variant="secondary">{props.conditions.length}</Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96">
        <FilterBuilderContent {...props} />
      </PopoverContent>
    </Popover>
  )
}
