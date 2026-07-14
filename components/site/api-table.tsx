import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type ApiRow = {
  /** Prop / option name, e.g. "enableSorting?". */
  name: string
  type: string
  /** Default value, shown as "—" when omitted. */
  defaultValue?: string
  description: string
}

/**
 * Prop/option reference table used by every feature page's "API Reference"
 * section. Markdown-serializable via apiRowsToMarkdown for CopyPageMenu.
 */
export function ApiTable({ rows }: { rows: ApiRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm ring-1 ring-foreground/5">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-44">Prop</TableHead>
            <TableHead className="w-56">Type</TableHead>
            <TableHead className="w-24">Default</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="align-top font-mono text-xs text-foreground">
                {row.name}
              </TableCell>
              <TableCell className="align-top font-mono text-xs whitespace-normal text-muted-foreground">
                {row.type}
              </TableCell>
              <TableCell className="align-top font-mono text-xs text-muted-foreground">
                {row.defaultValue ?? "—"}
              </TableCell>
              <TableCell className="align-top text-sm whitespace-normal text-muted-foreground">
                {row.description}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function apiRowsToMarkdown(rows: ApiRow[]): string {
  return rows
    .map(
      (r) =>
        `- \`${r.name}\` (${r.type}${r.defaultValue ? `, default ${r.defaultValue}` : ""}): ${r.description}`,
    )
    .join("\n")
}
