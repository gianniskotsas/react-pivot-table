"use client"

import * as React from "react"
import { Filter, Plus, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent } from "@/components/ui/popover"

import { FieldSelect, PopoverButtonTrigger } from "./primitives"
import { MultiSelect } from "./multi-select"
import {
  addConditionToGroup,
  addGroup,
  countActiveConditions,
  createCondition,
  OPERATOR_LABELS,
  operatorsForDef,
  removeConditionFromGroup,
  removeGroup,
  setGroupCombinator,
  setTopCombinator,
  updateConditionInGroup,
  withColumn,
  withOperator,
  withValue,
} from "./filter-utils"
import type {
  Combinator,
  FilterCondition,
  FilterDef,
  FilterGroup,
  FilterOperator,
  FilterState,
  FilterValue,
} from "./types"

type FilterBuilderProps = {
  filterableColumns: FilterDef[]
  filterState: FilterState
  onFilterStateChange: (next: FilterState) => void
}

const COMBINATOR_OPTIONS: { value: Combinator; label: string }[] = [
  { value: "and", label: "and" },
  { value: "or", label: "or" },
]

function newId(): string {
  return crypto.randomUUID()
}

function defFor(columns: FilterDef[], columnId: string): FilterDef {
  return columns.find((d) => d.id === columnId) ?? columns[0]
}

function CombinatorSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: Combinator
  onChange: (next: Combinator) => void
  ariaLabel: string
}) {
  return (
    <FieldSelect
      value={value}
      items={COMBINATOR_OPTIONS}
      onValueChange={(v) => onChange(v as Combinator)}
      ariaLabel={ariaLabel}
      className="w-20 text-xs"
    />
  )
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
    if (op === "isAnyOf" || op === "isNoneOf") {
      const selected = Array.isArray(condition.value) ? (condition.value as string[]) : []
      return (
        <MultiSelect
          options={def.options}
          selected={selected}
          onChange={(next) => onValueChange(next)}
          ariaLabel={ariaLabel}
          placeholder="Select…"
          className="w-full"
        />
      )
    }
    return (
      <FieldSelect
        value={condition.value == null ? "" : String(condition.value)}
        items={def.options}
        onValueChange={(v) => onValueChange(v)}
        ariaLabel={ariaLabel}
        placeholder="Select…"
        className="h-8 w-full"
      />
    )
  }

  if (op === "between" || op === "dateBetween") {
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

  const inputType = def.type === "number" ? "number" : def.type === "date" ? "date" : "text"
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

function ConditionRow({
  filterableColumns,
  group,
  condition,
  index,
  onState,
}: {
  filterableColumns: FilterDef[]
  group: FilterGroup
  condition: FilterCondition
  index: number
  onState: (fn: (s: FilterState) => FilterState) => void
}) {
  const def = defFor(filterableColumns, condition.columnId)
  const operators = operatorsForDef(def)
  const update = (next: FilterCondition) => onState((s) => updateConditionInGroup(s, group.id, next))

  return (
    <div className="flex items-start gap-1.5">
      <div className="w-14 shrink-0 pt-1.5 text-right text-xs text-muted-foreground">
        {index === 0 ? "Where" : null}
      </div>
      <FieldSelect
        value={condition.columnId}
        items={filterableColumns.map((d) => ({ value: d.id, label: d.label }))}
        onValueChange={(v) => update(withColumn(condition, v, filterableColumns))}
        ariaLabel="Filter column"
        className="h-8 w-28"
      />
      <FieldSelect
        value={condition.operator}
        items={operators.map((op) => ({ value: op, label: OPERATOR_LABELS[op] }))}
        onValueChange={(v) => update(withOperator(condition, v as FilterOperator))}
        ariaLabel="Filter operator"
        className="h-8 w-32"
      />
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
        onClick={() => onState((s) => removeConditionFromGroup(s, group.id, condition.id))}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}

export function FilterBuilderContent({
  filterableColumns,
  filterState,
  onFilterStateChange,
}: FilterBuilderProps) {
  const onState = React.useCallback(
    (fn: (s: FilterState) => FilterState) => onFilterStateChange(fn(filterState)),
    [filterState, onFilterStateChange],
  )

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Filters</p>

      {filterState.groups.length === 0 && (
        <p className="text-sm text-muted-foreground">No filters applied.</p>
      )}

      {filterState.groups.map((group, gi) => (
        <React.Fragment key={group.id}>
          {gi > 0 && (
            <div className="flex justify-start">
              {gi === 1 ? (
                <CombinatorSelect
                  value={filterState.combinator}
                  onChange={(c) => onState((s) => setTopCombinator(s, c))}
                  ariaLabel="Combine groups with"
                />
              ) : (
                <span className="px-2 text-xs text-muted-foreground">{filterState.combinator}</span>
              )}
            </div>
          )}
          <div className="space-y-2 rounded-md border p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {filterState.groups.length > 1 ? `Group ${gi + 1}` : "Group"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove filter group"
                onClick={() => onState((s) => removeGroup(s, group.id))}
              >
                <X className="size-4" />
              </Button>
            </div>
            {group.conditions.map((condition, ci) => (
              <div key={condition.id} className="space-y-2">
                {ci === 1 && (
                  <div>
                    <CombinatorSelect
                      value={group.combinator}
                      onChange={(c) => onState((s) => setGroupCombinator(s, group.id, c))}
                      ariaLabel="Combine conditions with"
                    />
                  </div>
                )}
                {ci > 1 && (
                  <div>
                    <span className="px-2 text-xs text-muted-foreground">{group.combinator}</span>
                  </div>
                )}
                <ConditionRow
                  filterableColumns={filterableColumns}
                  group={group}
                  condition={condition}
                  index={ci}
                  onState={onState}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-14 gap-1"
              onClick={() =>
                onState((s) => addConditionToGroup(s, group.id, createCondition(filterableColumns, newId())))
              }
            >
              <Plus className="size-4" />
              Add filter
            </Button>
          </div>
        </React.Fragment>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => onState((s) => addGroup(s, newId(), newId(), filterableColumns))}
      >
        <Plus className="size-4" />
        Add filter group
      </Button>
    </div>
  )
}

export function FilterPopover(props: FilterBuilderProps) {
  const count = countActiveConditions(props.filterState)
  return (
    <Popover>
      <PopoverButtonTrigger className="gap-2">
        <Filter className="size-4" />
        Filters
        {count > 0 && <Badge variant="secondary">{count}</Badge>}
      </PopoverButtonTrigger>
      <PopoverContent align="start" className="w-[34rem]">
        <FilterBuilderContent {...props} />
      </PopoverContent>
    </Popover>
  )
}
