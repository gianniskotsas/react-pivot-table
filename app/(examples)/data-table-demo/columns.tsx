import { defineColumns } from "@/components/data-table"

import type { Task } from "./data"

const PRIORITIES = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
]

const STATUSES = [
  { label: "To do", value: "todo" },
  { label: "In progress", value: "in_progress" },
  { label: "Review", value: "review" },
  { label: "Done", value: "done" },
]

const col = defineColumns<Task>()

// A mix of field types (text, singleSelect, number, currency, checkbox,
// date) exercising `defineColumns`'s typed `col.*` builders. `priority`,
// `hoursLogged`, and `dueDate` explicitly override `editable: false` to
// prove the per-column override wins over the table-level `editable` prop
// passed to <DataTable> in `data-table-client.tsx`.
export const columns = [
  col.text("title", { header: "Title" }),
  col.text("assignee", { header: "Assignee" }),
  col.singleSelect("priority", {
    header: "Priority",
    options: PRIORITIES,
    editable: false,
  }),
  col.singleSelect("status", { header: "Status", options: STATUSES }),
  col.number("hoursLogged", { header: "Hours", maximumFractionDigits: 1, editable: false }),
  col.currency("budget", { header: "Budget", currency: "USD" }),
  col.checkbox("completed", { header: "Done" }),
  col.date("dueDate", { header: "Due", editable: false }),
]
