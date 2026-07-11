import type { ColumnDef } from "@tanstack/react-table"

import {
  FIELD_ICONS,
  buttonCell,
  checkboxCell,
  currencyCell,
  dateCell,
  durationCell,
  emailCell,
  longTextCell,
  multiSelectCell,
  numberCell,
  percentCell,
  phoneCell,
  ratingCell,
  singleSelectCell,
  textCell,
  urlCell,
} from "@/components/table-fields"

import type { Employee } from "./data"

const DEPARTMENTS = [
  { label: "Sales", value: "sales" },
  { label: "Engineering", value: "eng" },
  { label: "Marketing", value: "mktg" },
  { label: "Finance", value: "fin" },
  { label: "HR", value: "hr" },
]

const SKILLS = [
  { label: "TypeScript", value: "ts" },
  { label: "React", value: "react" },
  { label: "Design", value: "design" },
  { label: "SQL", value: "sql" },
  { label: "Leadership", value: "lead" },
]

/** Header cell: the field's type icon + a label (Airtable-style). Returns a
 * render function, which is what TanStack's `header` accepts. */
function head(iconKey: keyof typeof FIELD_ICONS, label: string) {
  const Icon = FIELD_ICONS[iconKey]
  return function Header() {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
    )
  }
}

// The canonical shadcn/TanStack pattern: a plain `ColumnDef<T>[]` with
// `accessorKey`, each cell supplied by a standalone table-fields factory.
// This is the exact usage the I1 fix guarantees compiles under strict mode.
export const columns: ColumnDef<Employee>[] = [
  { accessorKey: "name", header: head("text", "Name"), cell: textCell<Employee>() },
  { accessorKey: "bio", header: head("longText", "Bio"), cell: longTextCell<Employee>() },
  {
    accessorKey: "age",
    header: head("number", "Age"),
    cell: numberCell<Employee>({ maximumFractionDigits: 0 }),
  },
  {
    accessorKey: "salary",
    header: head("currency", "Salary"),
    cell: currencyCell<Employee>({ currency: "USD" }),
  },
  { accessorKey: "completion", header: head("percent", "Done"), cell: percentCell<Employee>() },
  { accessorKey: "focusTime", header: head("duration", "Focus"), cell: durationCell<Employee>() },
  { accessorKey: "website", header: head("url", "Website"), cell: urlCell<Employee>() },
  { accessorKey: "email", header: head("email", "Email"), cell: emailCell<Employee>() },
  { accessorKey: "phone", header: head("phone", "Phone"), cell: phoneCell<Employee>() },
  {
    accessorKey: "department",
    header: head("singleSelect", "Dept"),
    cell: singleSelectCell<Employee>({ options: DEPARTMENTS }),
  },
  {
    accessorKey: "skills",
    header: head("multiSelect", "Skills"),
    cell: multiSelectCell<Employee>({ options: SKILLS }),
  },
  { accessorKey: "active", header: head("checkbox", "Active"), cell: checkboxCell<Employee>() },
  {
    accessorKey: "rating",
    header: head("rating", "Rating"),
    cell: ratingCell<Employee>({ max: 5 }),
  },
  { accessorKey: "startDate", header: head("date", "Start"), cell: dateCell<Employee>() },
  {
    id: "actions",
    header: head("button", "Action"),
    cell: buttonCell<Employee>({
      label: "View",
      onClick: (row) => window.alert(`View ${row.name}`),
    }),
  },
]
