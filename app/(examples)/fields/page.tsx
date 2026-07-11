import { FieldsTable } from "./fields-table"

export default function FieldsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          table-fields — every field type
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          A plain shadcn + TanStack table (a vanilla{" "}
          <code className="font-mono">ColumnDef&lt;Employee&gt;[]</code> +{" "}
          <code className="font-mono">useReactTable</code>, no DataTable shell) where
          every column is one of the 15 Release-1 field types, rendered by a standalone{" "}
          <code className="font-mono">@kotsas-ui/table-fields</code> cell factory. Scroll
          horizontally to see them all; click a Website/Email/Phone link or the View
          button to test interactivity.
        </p>
      </div>
      <FieldsTable />
    </div>
  )
}
