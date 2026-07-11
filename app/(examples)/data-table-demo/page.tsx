import { DataTableDemoClient } from "./data-table-client"

export default function DataTableDemoPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">data-table — editable demo</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          A <code className="font-mono">&lt;DataTable&gt;</code> built from{" "}
          <code className="font-mono">defineColumns</code>, mixing text, singleSelect, number,
          currency, checkbox, and date columns. The table is <code className="font-mono">
            editable
          </code>{" "}
          by default, but Priority, Hours, and Due are pinned to read-only via a per-column{" "}
          <code className="font-mono">editable: false</code> override — try editing Title,
          Assignee, Status, Budget, or Done to see committed edits persist in local state.
        </p>
        <p className="max-w-3xl text-xs text-muted-foreground">
          Note: there is currently no initial-column-pinning option on{" "}
          <code className="font-mono">defineColumns</code>/<code className="font-mono">
            useDataTable
          </code>
          , so no column is pinned by default here — use the columns menu to pin one manually.
        </p>
      </div>
      <DataTableDemoClient />
    </div>
  )
}
