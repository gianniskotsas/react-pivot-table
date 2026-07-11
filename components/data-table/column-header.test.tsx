import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ColumnHeader } from "./column-header"

function mockColumn({
  canSort = true,
  sorted = false as false | "asc" | "desc",
}: { canSort?: boolean; sorted?: false | "asc" | "desc" } = {}) {
  return {
    getCanSort: () => canSort,
    getIsSorted: () => sorted,
    getToggleSortingHandler: () => vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe("ColumnHeader", () => {
  it("renders the label as plain text when the column can't sort", () => {
    render(<ColumnHeader column={mockColumn({ canSort: false })} label="Name" />)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("renders a clickable button with a sort indicator when the column can sort", () => {
    const handler = vi.fn()
    const column = mockColumn()
    column.getToggleSortingHandler = () => handler
    render(<ColumnHeader column={column} label="Name" />)
    const button = screen.getByRole("button", { name: /Name/ })
    fireEvent.click(button)
    expect(handler).toHaveBeenCalled()
  })

  it("reflects the current sort direction", () => {
    const { rerender } = render(
      <ColumnHeader column={mockColumn({ sorted: "asc" })} label="Age" />,
    )
    expect(screen.getByRole("button").querySelector('[data-sort="asc"]')).not.toBeNull()
    rerender(<ColumnHeader column={mockColumn({ sorted: "desc" })} label="Age" />)
    expect(screen.getByRole("button").querySelector('[data-sort="desc"]')).not.toBeNull()
  })

  it("renders the icon prop when provided", () => {
    function TestIcon() {
      return <svg data-testid="test-icon" />
    }
    render(<ColumnHeader column={mockColumn()} label="Name" icon={TestIcon} />)
    expect(screen.getByTestId("test-icon")).toBeInTheDocument()
  })
})
