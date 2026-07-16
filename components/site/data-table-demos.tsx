"use client"

import * as React from "react"
import { Archive, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { DataTable, defineColumns, type DataTableAction } from "@/components/data-table"

type Task = {
  id: string
  title: string
  priority: string
  status: string
  hours: number
  budget: number
  done: boolean
  due: string
}

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

const BASIC_DATA: Task[] = [
  {
    id: "1",
    title: "Set up CI pipeline",
    priority: "high",
    status: "done",
    hours: 12,
    budget: 2400,
    done: true,
    due: "2026-05-02",
  },
  {
    id: "2",
    title: "Design onboarding flow",
    priority: "medium",
    status: "in_progress",
    hours: 8,
    budget: 3200,
    done: false,
    due: "2026-06-14",
  },
  {
    id: "3",
    title: "Migrate auth to OAuth2",
    priority: "urgent",
    status: "in_progress",
    hours: 21,
    budget: 5600,
    done: false,
    due: "2026-07-18",
  },
  {
    id: "4",
    title: "Write API docs",
    priority: "low",
    status: "todo",
    hours: 0,
    budget: 900,
    done: false,
    due: "2026-08-01",
  },
]

const basicCol = defineColumns<Task>()
const basicColumns = [
  basicCol.text("title", { header: "Title" }),
  basicCol.singleSelect("priority", {
    header: "Priority",
    options: PRIORITIES,
  }),
  basicCol.singleSelect("status", { header: "Status", options: STATUSES }),
  basicCol.currency("budget", { header: "Budget" }),
  basicCol.checkbox("done", { header: "Done" }),
]

// Plain demo — no selection/actions/filters, and Export off, since it's
// reused across feature pages (Sorting, Column Resizing, Copy/Paste & Undo)
// whose own topic isn't the toolbar's Export button. See ExportDataTableDemo
// for the one page (Export Data) where Export should actually be visible.
export function BasicDataTableDemo() {
  const [data, setData] = React.useState(BASIC_DATA)

  const handleUpdateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setData((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, [columnId]: value } : row
        )
      )
    },
    []
  )

  return (
    <div className="w-full">
      <DataTable<Task>
        data={data}
        columns={basicColumns}
        getRowId={(row) => row.id}
        editable
        onUpdateData={handleUpdateData}
        enablePagination={false}
        enableExport={false}
      />
    </div>
  )
}

export function ExportDataTableDemo() {
  const [data, setData] = React.useState(BASIC_DATA)

  const handleUpdateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setData((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, [columnId]: value } : row
        )
      )
    },
    []
  )

  return (
    <div className="w-full">
      <DataTable<Task>
        data={data}
        columns={basicColumns}
        getRowId={(row) => row.id}
        editable
        onUpdateData={handleUpdateData}
        enableRowSelection
        enablePagination={false}
      />
    </div>
  )
}

export function ColumnManagementDataTableDemo() {
  const [data, setData] = React.useState(BASIC_DATA)

  const handleUpdateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setData((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, [columnId]: value } : row
        )
      )
    },
    []
  )

  return (
    <div className="w-full">
      <DataTable<Task>
        data={data}
        columns={basicColumns}
        getRowId={(row) => row.id}
        editable
        onUpdateData={handleUpdateData}
        enablePagination={false}
        enableExport={false}
      />
    </div>
  )
}

const SELECTION_DATA: Task[] = [
  ...BASIC_DATA,
  {
    id: "5",
    title: "Fix pagination bug",
    priority: "high",
    status: "review",
    hours: 4,
    budget: 600,
    done: false,
    due: "2026-07-15",
  },
  {
    id: "6",
    title: "Upgrade Next.js to 16",
    priority: "medium",
    status: "done",
    hours: 16,
    budget: 1800,
    done: true,
    due: "2026-04-28",
  },
]

const selectionCol = defineColumns<Task>()
const selectionColumns = [
  selectionCol.text("title", { header: "Title" }),
  selectionCol.singleSelect("priority", {
    header: "Priority",
    options: PRIORITIES,
  }),
  selectionCol.number("hours", { header: "Hours" }),
  selectionCol.currency("budget", { header: "Budget" }),
]

const selectionActions: DataTableAction<Task>[] = [
  {
    id: "archive",
    label: "Archive",
    icon: Archive,
    onClick: ({ rows }) => toast(`Archived ${rows.length} task${rows.length === 1 ? "" : "s"}`),
  },
  {
    id: "delete",
    label: "Delete",
    icon: Trash2,
    variant: "destructive",
    onClick: ({ rows }) => toast(`Deleted ${rows.length} task${rows.length === 1 ? "" : "s"}`),
  },
]

// Row Selection & Actions' own demo: selection + the Actions dropdown only —
// no footer (that's Footer & Aggregation's own demo below) and Export off.
export function RowSelectionDataTableDemo() {
  const [data, setData] = React.useState(SELECTION_DATA)

  const handleUpdateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setData((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, [columnId]: value } : row
        )
      )
    },
    []
  )

  return (
    <div className="w-full">
      <DataTable<Task>
        data={data}
        columns={selectionColumns}
        getRowId={(row) => row.id}
        editable
        onUpdateData={handleUpdateData}
        enableRowSelection
        enablePagination={false}
        enableExport={false}
        actions={selectionActions}
      />
    </div>
  )
}

// Footer & Aggregation's own demo: selection is kept (the footer scopes to
// it — that's the feature's own mechanic, not an unrelated one), but no
// Actions dropdown and Export off.
export function FooterAggregationDataTableDemo() {
  const [data, setData] = React.useState(SELECTION_DATA)

  const handleUpdateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setData((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, [columnId]: value } : row
        )
      )
    },
    []
  )

  return (
    <div className="w-full">
      <DataTable<Task>
        data={data}
        columns={selectionColumns}
        getRowId={(row) => row.id}
        editable
        onUpdateData={handleUpdateData}
        enableRowSelection
        enablePagination={false}
        enableExport={false}
        calculableColumns={[
          { columnId: "hours", default: "sum" },
          { columnId: "budget", methods: ["sum", "avg"], default: "sum" },
        ]}
      />
    </div>
  )
}

const filterCol = defineColumns<Task>()
const filterColumns = [
  filterCol.text("title", { header: "Title" }),
  filterCol.singleSelect("priority", { header: "Priority", options: PRIORITIES }),
  filterCol.singleSelect("status", { header: "Status", options: STATUSES }),
  filterCol.currency("budget", { header: "Budget" }),
]

export function FilterableDataTableDemo() {
  const [data, setData] = React.useState(SELECTION_DATA)

  const handleUpdateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setData((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, [columnId]: value } : row
        )
      )
    },
    []
  )

  return (
    <div className="w-full">
      <DataTable<Task>
        data={data}
        columns={filterColumns}
        getRowId={(row) => row.id}
        editable
        onUpdateData={handleUpdateData}
        enablePagination={false}
        enableExport={false}
        filterableColumns={[
          { id: "priority", label: "Priority", type: "select", options: PRIORITIES },
          { id: "status", label: "Status", type: "select", options: STATUSES },
          { id: "budget", label: "Budget", type: "number" },
        ]}
      />
    </div>
  )
}

type Employee = {
  id: string
  name: string
  email: string
  department: string
  role: string
  location: string
  salary: number
  startDate: string
  active: boolean
}

const DEPARTMENTS = [
  { label: "Engineering", value: "engineering" },
  { label: "Design", value: "design" },
  { label: "Sales", value: "sales" },
  { label: "Operations", value: "operations" },
]

const EMPLOYEES: Employee[] = [
  { id: "1", name: "Elena Ruiz", email: "elena@acme.dev", department: "engineering", role: "Staff Engineer", location: "Barcelona, ES", salary: 132000, startDate: "2021-03-15", active: true },
  { id: "2", name: "Marcus Webb", email: "marcus@acme.dev", department: "design", role: "Product Designer", location: "London, UK", salary: 98000, startDate: "2022-09-01", active: true },
  { id: "3", name: "Sofia Novak", email: "sofia@acme.dev", department: "sales", role: "Account Executive", location: "Prague, CZ", salary: 87000, startDate: "2023-01-10", active: true },
  { id: "4", name: "Liam Chen", email: "liam@acme.dev", department: "engineering", role: "Frontend Engineer", location: "Singapore, SG", salary: 112000, startDate: "2020-11-23", active: false },
  { id: "5", name: "Amara Diallo", email: "amara@acme.dev", department: "operations", role: "Ops Manager", location: "Dakar, SN", salary: 91000, startDate: "2024-05-06", active: true },
]

const employeeCol = defineColumns<Employee>()
const employeeColumns = [
  employeeCol.text("name", { header: "Name", size: 180 }),
  employeeCol.email("email", { header: "Email", size: 220 }),
  employeeCol.singleSelect("department", { header: "Department", options: DEPARTMENTS, size: 160 }),
  employeeCol.text("role", { header: "Role", size: 190 }),
  employeeCol.text("location", { header: "Location", size: 170 }),
  employeeCol.currency("salary", { header: "Salary", size: 140 }),
  employeeCol.date("startDate", { header: "Start Date", size: 140 }),
  employeeCol.checkbox("active", { header: "Active", size: 110 }),
]

// Wide on purpose (~1300px of columns) so the preview canvas scrolls
// horizontally and the frozen Name column visibly holds its ground.
export function FreezeColumnsDataTableDemo() {
  const [data, setData] = React.useState(EMPLOYEES)

  const handleUpdateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setData((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, [columnId]: value } : row
        )
      )
    },
    []
  )

  return (
    <div className="w-full">
      <DataTable<Employee>
        data={data}
        columns={employeeColumns}
        getRowId={(row) => row.id}
        editable
        onUpdateData={handleUpdateData}
        enablePagination={false}
        enableExport={false}
        initialColumnPinning={{ left: ["name"] }}
      />
    </div>
  )
}
