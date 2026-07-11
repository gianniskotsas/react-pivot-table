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
 * edits are visibly reflected in the grid.
 */
export function DataTableDemoClient() {
  const [data, setData] = React.useState<Task[]>(initialTasks)

  const handleUpdateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setData((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, [columnId]: value } : row)),
      )
    },
    [],
  )

  return (
    <DataTable<Task>
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      editable
      onUpdateData={handleUpdateData}
    />
  )
}
