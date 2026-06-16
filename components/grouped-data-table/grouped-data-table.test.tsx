import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ColumnDef } from "@tanstack/react-table"

import { GroupedDataTable } from "./grouped-data-table"

type Acct = { id: string; entity: string; bank: string; currency: string }

const data: Acct[] = [
  { id: "1", entity: "Coffee Inc", bank: "Citi", currency: "USD" },
  { id: "2", entity: "Coffee Inc", bank: "HSBC", currency: "EUR" },
  { id: "3", entity: "Holding BV", bank: "HSBC", currency: "EUR" },
]

const columns: ColumnDef<Acct, unknown>[] = [
  { id: "entity", accessorKey: "entity", header: "Entity", enableGrouping: true },
  { id: "bank", accessorKey: "bank", header: "Bank", enableGrouping: true },
  { id: "currency", accessorKey: "currency", header: "Ccy" },
]

describe("GroupedDataTable", () => {
  it("renders the group-by toolbar, the group column header, and grouped rows with leaf counts", () => {
    render(
      <GroupedDataTable<Acct>
        data={data}
        columns={columns}
        groupableDimensions={[{ id: "entity", label: "Entity" }]}
        initialGrouping={["entity"]}
        enablePagination={false}
        groupColumn={{ header: "Account", renderLeaf: (row) => row.original.id }}
      />,
    )
    expect(
      screen.getByRole("button", { name: /group by/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("Account")).toBeInTheDocument()
    expect(screen.getByText("Coffee Inc")).toBeInTheDocument()
    expect(screen.getByText("Holding BV")).toBeInTheDocument()
    // Coffee Inc has 2 leaf rows, Holding BV has 1.
    expect(screen.getByText("(2)")).toBeInTheDocument()
    expect(screen.getByText("(1)")).toBeInTheDocument()
  })

  it("renders an empty state when there is no data", () => {
    render(
      <GroupedDataTable<Acct>
        data={[]}
        columns={columns}
        groupableDimensions={[{ id: "entity", label: "Entity" }]}
        enablePagination={false}
        groupColumn={{ header: "Account", renderLeaf: (row) => row.original.id }}
      />,
    )
    expect(screen.getByText("No results.")).toBeInTheDocument()
  })

  it("renders pagination controls (disabled at a single page) when enabled", () => {
    render(
      <GroupedDataTable<Acct>
        data={data}
        columns={columns}
        groupableDimensions={[{ id: "entity", label: "Entity" }]}
        initialGrouping={["entity"]}
        enablePagination
        groupColumn={{ header: "Account", renderLeaf: (row) => row.original.id }}
      />,
    )
    const prev = screen.getByRole("button", { name: "Previous page" })
    const next = screen.getByRole("button", { name: "Next page" })
    expect(prev).toBeDisabled()
    // Only one page of grouped rows, so Next is disabled too.
    expect(next).toBeDisabled()
    expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument()
  })
})
