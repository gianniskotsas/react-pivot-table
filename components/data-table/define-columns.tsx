"use client"

import * as React from "react"
import type { CellContext, ColumnDef } from "@tanstack/react-table"

import {
  buttonField,
  checkboxField,
  currencyField,
  dateField,
  durationField,
  emailField,
  longTextField,
  multiSelectField,
  numberField,
  percentField,
  phoneField,
  ratingField,
  singleSelectField,
  textField,
  urlField,
  type FieldType,
  type SelectOption,
} from "@/components/table-fields"

import { useDataTableRuntime } from "./data-table-runtime-context"
import type { CellPos, DataTableColumnMeta } from "./types"

/**
 * Keys of TData whose value type extends V. Powers col.number("age")
 * type-checking. Note this is a BIDIRECTIONAL extends check (`TData[K]
 * extends V ? (V extends TData[K] ? K : never) : never`), i.e. an exact-type
 * match rather than a one-directional "assignable to V" check — `-?` also
 * strips optionality before comparing. This is deliberate: it's what makes
 * `col.text` reject a field typed `string | undefined` (which is assignable
 * to `string` in one direction but not exact). Don't "simplify" this to a
 * plain one-directional `extends` — that would silently accept wider types.
 */
type KeysMatching<TData, V> = {
  [K in keyof TData]-?: TData[K] extends V ? (V extends TData[K] ? K : never) : never
}[keyof TData] &
  string

type ColumnOptions = {
  /** Overrides the auto-generated (capitalized-key) header label. */
  header?: string
  /** Per-column editable override; undefined falls back to the table default. */
  editable?: boolean
  /** Whether the column can be sorted. Defaults to true (false for col.button). */
  enableSorting?: boolean
  /** Whether the column can be hidden via the columns menu. Defaults to true. */
  enableHiding?: boolean
  /** Whether the column can be pinned. Defaults to true. */
  enablePinning?: boolean
  /** Whether the column can be resized. Defaults to true. */
  enableResizing?: boolean
  /** Fixed column width in pixels; undefined lets TanStack use its default. */
  size?: number
}

// camelCase accessor keys aren't word-split (e.g. "firstName" only gets its
// first letter capitalized, not turned into "First Name") — pass an explicit
// `header` for multi-word keys.
function labelFor(key: string, header?: string): string {
  if (header) return header
  return key.charAt(0).toUpperCase() + key.slice(1)
}

/**
 * Renders a field's display or edit UI depending on live DataTableRuntime
 * state. Built once per column (stable identity across renders), so it can
 * hold its own local "staged" edit value via useState — `field.edit` itself
 * is a plain function (not a component), so all editing state lives here,
 * one level up, and is handed to `field.edit` through FieldEditContext.
 */
function makeFieldCell<TData, V>(
  field: FieldType<V>,
  columnEditableOverride: boolean | undefined,
) {
  return function FieldCell(ctx: CellContext<TData, unknown>) {
    const runtime = useDataTableRuntime()
    const value = ctx.getValue() as V
    const pos: CellPos = { rowId: ctx.row.id, columnId: ctx.column.id }
    const [staged, setStaged] = React.useState<V>(value)
    // isEditing and isActive must both be computed before any hook call below
    // (Rules of Hooks forbid calling useEffect only on some render paths), so
    // they can't be read from `runtime` after the `if (!runtime)` early
    // return.
    const isEditing = runtime ? runtime.isEditing(pos) : false
    const isActive = runtime ? runtime.isActive(pos) : false
    const cellRef = React.useRef<HTMLDivElement>(null)
    // Captured in onMouseDown, read in onClick — see the comment on
    // onMouseDown below for why onClick can't just read `isActive` directly.
    const wasActiveBeforeMouseDownRef = React.useRef(false)

    React.useEffect(() => {
      if (isEditing) setStaged(value)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing])

    // Keep real DOM focus in sync with the logical active cell — arrow-key/
    // Tab navigation (useGridNavigation.moveActive) only updates React state,
    // it never calls .focus() itself. Without this, document.activeElement
    // can drift from the cell that's visually/logically active, which is a
    // real screen-reader bug even though keyboard nav still mechanically
    // works (the keydown listener sits on an ancestor and catches bubbled
    // events regardless of which descendant has focus).
    //
    // Depends on BOTH [isActive, isEditing], not just [isActive]: this cell's
    // <div ref={cellRef}> is unmounted while isEditing is true (the
    // `field.edit(...)` branch below returns a completely different tree,
    // e.g. an <input>) and remounted — a fresh DOM node, ref reattached from
    // scratch — the moment isEditing flips back to false. beginEdit/
    // stopEditing never touch activeCell, so a cell can stay active the
    // entire time isEditing goes true→false (Escape, or committing an edit);
    // with only [isActive] as the dependency, isActive never changes across
    // that cycle, so the effect wouldn't rerun and the newly-remounted div
    // would never get focused — document.activeElement would fall back to
    // <body> (whatever last had focus, e.g. the just-unmounted <input>) even
    // though the ring still shows this cell as active. That's not just a
    // cosmetic miss: with focus on <body>, the wrapper's onKeyDown (bound on
    // a div that is an ANCESTOR of body's children, not of body itself) never
    // sees the event — Enter, arrows, everything silently does nothing until
    // the user clicks again. Depending on isEditing too makes the effect
    // rerun exactly on that remount and reclaim focus. Still can't steal
    // focus from an editor mid-edit in another cell (that cell's own isActive
    // is false) and still can't loop (calling .focus() here re-triggers this
    // cell's onFocus → setActiveCell with the same pos, a same-value update:
    // isActive and isEditing both stay put, so this effect's deps don't
    // change and it doesn't refire).
    React.useEffect(() => {
      if (isActive && !isEditing) cellRef.current?.focus()
    }, [isActive, isEditing])

    if (!runtime) {
      // No <DataTable> runtime in scope — degrade to a plain read-only cell.
      return field.display(ctx as CellContext<unknown, V>)
    }

    const editable =
      (columnEditableOverride ?? runtime.isColumnEditable(pos.columnId)) && Boolean(field.edit)

    if (isEditing && field.edit) {
      return field.edit({
        value: staged,
        setValue: setStaged,
        commit: () => {
          runtime.updateData(pos.rowId, pos.columnId, staged)
          runtime.stopEditing()
        },
        cancel: () => runtime.stopEditing(),
        focusNext: (dir) => {
          // moveActive already clears editingCell internally, so an explicit
          // stopEditing() here would be redundant.
          runtime.moveActive(dir)
        },
      })
    }

    return (
      <div
        ref={cellRef}
        tabIndex={0}
        data-active={isActive ? "true" : undefined}
        // A real mouse click dispatches `mousedown` → native focus move →
        // `focus` → `mouseup` → `click`, as separate top-level browser
        // events. Each one gets its own React commit, so by the time
        // `onClick` runs, the `focus` event above has *already* called
        // `runtime.setActiveCell(pos)` and re-rendered this cell with
        // `isActive: true` — even on a cell that was NOT active before this
        // click. Reading `isActive` inside `onClick` therefore can't tell
        // "was already active" (click #2, should edit) apart from "just
        // became active via this click's own focus event" (click #1, should
        // only activate): both read `isActive === true`. Every first click on
        // an inactive editable cell would incorrectly jump straight to edit
        // mode. `onMouseDown` fires BEFORE the browser moves focus, so it's
        // the only handler that sees the true pre-click state; capture it
        // here and have onClick decide off the captured ref instead of the
        // (by-then-stale-for-this-purpose) live `isActive`.
        onMouseDown={() => {
          wasActiveBeforeMouseDownRef.current = isActive
        }}
        onClick={() => {
          if (wasActiveBeforeMouseDownRef.current && editable) runtime.beginEdit(pos)
          else runtime.setActiveCell(pos)
        }}
        onFocus={() => runtime.setActiveCell(pos)}
        className="rounded-sm px-2 py-1 outline-none data-[active=true]:ring-2 data-[active=true]:ring-ring data-[active=true]:ring-inset"
      >
        {field.display(ctx as CellContext<unknown, V>)}
      </div>
    )
  }
}

function buildColumn<TData, V>(
  field: FieldType<V>,
  key: string,
  opts: ColumnOptions = {},
  buildOpts: { noAccessor?: boolean } = {},
): ColumnDef<TData, unknown> {
  const meta: DataTableColumnMeta = { editable: opts.editable, label: labelFor(key, opts.header) }
  return {
    id: key,
    // `key` is a validated TData key for every field method except
    // col.button (where `noAccessor` is set and this line is skipped
    // entirely — see below). `as never` sidesteps ColumnDef's accessorKey
    // overload resolution, which otherwise can't unify with the generic `V`
    // used here; `keyof TData & string` doesn't type-check because TData
    // isn't statically known to have a string-keyed shape at this call site.
    ...(buildOpts.noAccessor ? {} : { accessorKey: key as never }),
    header: meta.label,
    cell: makeFieldCell<TData, V>(field, opts.editable),
    meta,
    enableSorting: opts.enableSorting ?? true,
    enableHiding: opts.enableHiding ?? true,
    enablePinning: opts.enablePinning ?? true,
    enableResizing: opts.enableResizing ?? true,
    size: opts.size,
  }
}

/**
 * Returns a typed `col` builder closed over TData. Each method constrains its
 * accessor key to a TData key whose value type matches the field (e.g.
 * `col.number` only accepts keys typed `number`), and returns a ColumnDef
 * ready to drop into `columns: [...]`.
 */
export function defineColumns<TData>() {
  return {
    text: (key: KeysMatching<TData, string>, opts?: ColumnOptions) =>
      buildColumn<TData, string>(textField(), key, opts),
    longText: (key: KeysMatching<TData, string>, opts?: ColumnOptions) =>
      buildColumn<TData, string>(longTextField(), key, opts),
    url: (key: KeysMatching<TData, string>, opts?: ColumnOptions) =>
      buildColumn<TData, string>(urlField(), key, opts),
    email: (key: KeysMatching<TData, string>, opts?: ColumnOptions) =>
      buildColumn<TData, string>(emailField(), key, opts),
    phone: (key: KeysMatching<TData, string>, opts?: ColumnOptions) =>
      buildColumn<TData, string>(phoneField(), key, opts),
    number: (
      key: KeysMatching<TData, number>,
      opts?: ColumnOptions & { locale?: string; maximumFractionDigits?: number },
    ) => buildColumn<TData, number>(numberField(opts), key, opts),
    currency: (
      key: KeysMatching<TData, number>,
      opts?: ColumnOptions & { currency?: string; locale?: string },
    ) => buildColumn<TData, number>(currencyField(opts), key, opts),
    percent: (
      key: KeysMatching<TData, number>,
      opts?: ColumnOptions & { locale?: string; maximumFractionDigits?: number },
    ) => buildColumn<TData, number>(percentField(opts), key, opts),
    duration: (
      key: KeysMatching<TData, number>,
      opts?: ColumnOptions & { unit?: "s" | "ms"; maxUnits?: number },
    ) => buildColumn<TData, number>(durationField(opts), key, opts),
    singleSelect: (
      key: KeysMatching<TData, string>,
      opts: ColumnOptions & { options: SelectOption[] },
    ) => buildColumn<TData, string>(singleSelectField(opts), key, opts),
    multiSelect: (
      key: KeysMatching<TData, string[]>,
      opts: ColumnOptions & { options: SelectOption[] },
    ) => buildColumn<TData, string[]>(multiSelectField(opts), key, opts),
    checkbox: (key: KeysMatching<TData, boolean>, opts?: ColumnOptions) =>
      buildColumn<TData, boolean>(checkboxField(), key, opts),
    rating: (key: KeysMatching<TData, number>, opts?: ColumnOptions & { max?: number }) =>
      buildColumn<TData, number>(ratingField(opts), key, opts),
    date: (
      key: KeysMatching<TData, Date | string>,
      opts?: ColumnOptions & { withTime?: boolean; locale?: string },
    ) => buildColumn<TData, Date | string>(dateField(opts), key, opts),
    button: (
      id: string,
      opts: ColumnOptions & { label: string; onClick: (row: TData) => void },
    ) =>
      // buttonField's display never reads ctx.getValue() — it's an action
      // column, not a data column — so it defaults to unsortable (still
      // overridable via an explicit opts.enableSorting) and has no real
      // TData accessor (id-only display column; see buildColumn's
      // `noAccessor`), since `id` here is just an identifier, not a key into
      // TData.
      buildColumn<TData, unknown>(
        buttonField<TData>(opts),
        id,
        { ...opts, enableSorting: opts.enableSorting ?? false },
        { noAccessor: true },
      ),
  }
}
