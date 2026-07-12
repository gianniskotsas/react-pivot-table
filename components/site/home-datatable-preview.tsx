"use client"

import * as React from "react"

import { DataTable, defineColumns } from "@/components/data-table"

type Task = {
  id: string
  title: string
  priority: string
  status: string
  hours: number
}

const INITIAL: Task[] = [
  {
    id: "1",
    title: "Set up CI pipeline",
    priority: "high",
    status: "done",
    hours: 12,
  },
  {
    id: "2",
    title: "Design onboarding flow",
    priority: "medium",
    status: "in_progress",
    hours: 8,
  },
  {
    id: "3",
    title: "Migrate auth to OAuth2",
    priority: "urgent",
    status: "in_progress",
    hours: 21,
  },
  {
    id: "4",
    title: "Write API docs",
    priority: "low",
    status: "todo",
    hours: 3,
  },
]

const col = defineColumns<Task>()

const columns = [
  col.text("title", { header: "Title" }),
  col.singleSelect("priority", {
    header: "Priority",
    options: [
      { label: "Low", value: "low" },
      { label: "Medium", value: "medium" },
      { label: "High", value: "high" },
      { label: "Urgent", value: "urgent" },
    ],
  }),
  col.singleSelect("status", {
    header: "Status",
    options: [
      { label: "To do", value: "todo" },
      { label: "In progress", value: "in_progress" },
      { label: "Done", value: "done" },
    ],
  }),
  col.number("hours", { header: "Hours" }),
]

export function HomeDataTablePreview() {
  const [data, setData] = React.useState(INITIAL)

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
    <DataTable<Task>
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      editable
      onUpdateData={handleUpdateData}
      enableRowSelection
      enablePagination={false}
      calculableColumns={[{ columnId: "hours", default: "sum" }]}
    />
  )
}
