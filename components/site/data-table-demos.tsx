"use client"

import * as React from "react"

import { DataTable, defineColumns } from "@/components/data-table"

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

export function SelectionDataTableDemo() {
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
        calculableColumns={[
          { columnId: "hours", default: "sum" },
          { columnId: "budget", methods: ["sum", "avg"], default: "sum" },
        ]}
      />
    </div>
  )
}
