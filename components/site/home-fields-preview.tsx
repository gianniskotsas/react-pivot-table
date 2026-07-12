"use client"

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { defineColumns } from "@/components/data-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "@/components/ui/table"

type Person = {
  id: string
  name: string
  role: string
  salary: number
  rating: number
  active: boolean
}

const DATA: Person[] = [
  {
    id: "1",
    name: "Priya Shah",
    role: "engineer",
    salary: 142000,
    rating: 5,
    active: true,
  },
  {
    id: "2",
    name: "Marcus Lee",
    role: "designer",
    salary: 118000,
    rating: 4,
    active: true,
  },
  {
    id: "3",
    name: "Ines Rossi",
    role: "manager",
    salary: 165000,
    rating: 4,
    active: false,
  },
]

const col = defineColumns<Person>()

const columns = [
  col.text("name", { header: "Name" }),
  col.singleSelect("role", {
    header: "Role",
    options: [
      { label: "Engineer", value: "engineer" },
      { label: "Designer", value: "designer" },
      { label: "Manager", value: "manager" },
    ],
  }),
  col.currency("salary", { header: "Salary", currency: "USD" }),
  col.rating("rating", { header: "Rating" }),
  col.checkbox("active", { header: "Active" }),
]

export function HomeFieldsPreview() {
  const table = useReactTable({
    data: DATA,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="w-full overflow-hidden rounded-md border bg-background">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="p-0">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
