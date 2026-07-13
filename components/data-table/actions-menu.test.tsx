import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ActionsMenu, ActionsMenuContent } from "./actions-menu"
import type { DataTableAction } from "./types"

type Row = { id: string; name: string }

function mockAction(overrides: Partial<DataTableAction<Row>> = {}): DataTableAction<Row> {
  return {
    id: "archive",
    label: "Archive",
    onClick: vi.fn(),
    ...overrides,
  }
}

describe("ActionsMenuContent", () => {
  it("renders each action's label", () => {
    const actions = [mockAction({ id: "archive", label: "Archive" }), mockAction({ id: "delete", label: "Delete" })]
    render(
      <ActionsMenuContent actions={actions} rowIds={[]} rows={[]} onActionClick={vi.fn()} />,
    )
    expect(screen.getByText("Archive")).toBeInTheDocument()
    expect(screen.getByText("Delete")).toBeInTheDocument()
  })

  it("clicking an action calls its onClick with the row context, then onActionClick", async () => {
    const onClick = vi.fn()
    const onActionClick = vi.fn()
    const rows: Row[] = [{ id: "1", name: "Ada" }]
    render(
      <ActionsMenuContent
        actions={[mockAction({ onClick })]}
        rowIds={["1"]}
        rows={rows}
        onActionClick={onActionClick}
      />,
    )
    await userEvent.click(screen.getByText("Archive"))
    expect(onClick).toHaveBeenCalledWith({ rowIds: ["1"], rows })
    expect(onActionClick).toHaveBeenCalled()
  })

  it("a disabled action does not fire onClick", async () => {
    const onClick = vi.fn()
    render(
      <ActionsMenuContent
        actions={[mockAction({ onClick, disabled: true })]}
        rowIds={[]}
        rows={[]}
        onActionClick={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByText("Archive"))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe("ActionsMenu", () => {
  function mockTable(selectedRows: { id: string; original: Row }[]) {
    return {
      getSelectedRowModel: () => ({ rows: selectedRows }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  }

  it("shows a selected-count badge only when rows are selected", () => {
    const { rerender } = render(
      <ActionsMenu table={mockTable([])} actions={[mockAction()]} />,
    )
    expect(screen.queryByText("1")).toBeNull()

    rerender(
      <ActionsMenu
        table={mockTable([{ id: "1", original: { id: "1", name: "Ada" } }])}
        actions={[mockAction()]}
      />,
    )
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("disables the trigger when no rows are selected, enables it once a row is selected", () => {
    const { rerender } = render(
      <ActionsMenu table={mockTable([])} actions={[mockAction()]} />,
    )
    expect(screen.getByRole("button", { name: "Actions" })).toBeDisabled()

    rerender(
      <ActionsMenu
        table={mockTable([{ id: "1", original: { id: "1", name: "Ada" } }])}
        actions={[mockAction()]}
      />,
    )
    expect(screen.getByRole("button", { name: /^actions/i })).not.toBeDisabled()
  })

  it("clicking an action closes the popover", async () => {
    const table = mockTable([{ id: "1", original: { id: "1", name: "Ada" } }])
    render(<ActionsMenu table={table} actions={[mockAction()]} />)

    await userEvent.click(screen.getByRole("button", { name: /^actions/i }))
    const archive = await screen.findByText("Archive")
    await userEvent.click(archive)
    expect(screen.queryByText("Archive")).toBeNull()
  })
})
