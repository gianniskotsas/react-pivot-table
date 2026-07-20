"use client"

import { flexRender } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DimensionPicker } from "@/components/dimension-picker"
import { FilterPopover } from "./filter-builder"
import { GroupCell } from "./group-cell"
import { useGroupedTable } from "./use-grouped-table"
import type { GroupedDataTableProps } from "./types"

export function GroupedDataTable<TData>(props: GroupedDataTableProps<TData>) {
  const { table, grouping, setGrouping, filterState, setFilterState } =
    useGroupedTable(props)
  const enablePagination = props.enablePagination ?? true
  const columnCount = table.getVisibleFlatColumns().length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {props.filterableColumns && props.filterableColumns.length > 0 && (
          <FilterPopover
            filterableColumns={props.filterableColumns}
            filterState={filterState}
            onFilterStateChange={setFilterState}
          />
        )}
        <DimensionPicker
          dimensions={props.groupableDimensions}
          grouping={grouping}
          onGroupingChange={setGrouping}
        />
      </div>

      {/* bg-background: without a fill here the table is fully transparent,
          showing whatever's behind it (e.g. a docs preview canvas's dot
          pattern) straight through the rows — see data-table.tsx's own
          wrapper for the matching fix and why bg-background (not bg-card)
          is the right token. */}
      <div className="rounded-md border bg-background">
        <Table>
          {/* Muted band matching data-table's header treatment — column labels
              anchor the grid instead of floating on the body's surface. */}
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <GroupCell cell={cell} groupColumn={props.groupColumn} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {enablePagination && (
        <nav
          aria-label="Table pagination"
          className="flex items-center justify-end gap-2"
        >
          <Button
            variant="outline"
            size="sm"
            aria-label="Previous page"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            aria-label="Next page"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  )
}
