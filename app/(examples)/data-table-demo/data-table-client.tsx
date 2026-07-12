"use client"

import * as React from "react"

import { DataTable } from "@/components/data-table"

import { columns } from "./columns"
import { tasks as initialTasks, type Task } from "./data"

/**
 * Manual smoke-test harness for <DataTable>: `editable` is on at the table
 * level, three columns (`priority`, `hoursLogged`, `dueDate`) override it to
 * `editable: false` via `defineColumns`'s per-column `editable` option, and
 * `onUpdateData` mutates local state (not just console.log) so committed
 * edits are visibly reflected in the grid. `enableRowSelection` turns on the
 * row-number/checkbox gutter and tri-state select-all; `calculableColumns`
 * exercises the footer's method picker and client-side aggregation over
 * `hoursLogged`/`budget`. `onCreateRows` appends rows pasted past the end of
 * the table to local state. Undo/redo/paste/clear/export confirmation toasts
 * render via the global `<Toaster />` mounted in the root layout.
 */
export function DataTableDemoClient() {
  const [data, setData] = React.useState<Task[]>(initialTasks)

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

  const handleCreateRows = React.useCallback((partialRows: Partial<Task>[]) => {
    setData((prev) => [
      ...prev,
      ...partialRows.map((partial, i) => ({
        id: `new-${Date.now()}-${i}`,
        title: "",
        assignee: "",
        priority: "medium",
        status: "todo",
        hoursLogged: 0,
        budget: 0,
        completed: false,
        dueDate: new Date().toISOString().slice(0, 10),
        ...partial,
      })),
    ])
  }, [])

  return (
    <DataTable<Task>
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      editable
      onUpdateData={handleUpdateData}
      onCreateRows={handleCreateRows}
      enableRowSelection
      calculableColumns={[
        { columnId: "hoursLogged", default: "sum" },
        { columnId: "budget", methods: ["sum", "avg"], default: "sum" },
      ]}
    />
  )
}
