"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type MultiSelectOption = { label: string; value: string }

type MultiSelectProps = {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
}

export function multiSelectLabel(selected: string[], placeholder: string): string {
  return selected.length === 0 ? placeholder : `${selected.length} selected`
}

export function MultiSelectContent({
  options,
  selected,
  onChange,
}: Pick<MultiSelectProps, "options" | "selected" | "onChange">) {
  function toggle(value: string, checked: boolean) {
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value))
  }
  return (
    <div className="flex max-h-64 flex-col gap-1 overflow-auto">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm select-none hover:bg-muted"
        >
          <Checkbox
            checked={selected.includes(opt.value)}
            onCheckedChange={(checked) => toggle(opt.value, checked === true)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select…",
  ariaLabel,
  className,
}: MultiSelectProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={(p) => (
          <Button
            {...p}
            type="button"
            variant="outline"
            size="sm"
            aria-label={ariaLabel}
            className={cn("h-8 justify-between gap-2 font-normal", className)}
          />
        )}
      >
        <span className={cn(selected.length === 0 && "text-muted-foreground")}>
          {multiSelectLabel(selected, placeholder)}
        </span>
        <Check className="size-3 opacity-0" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56">
        <MultiSelectContent options={options} selected={selected} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}
