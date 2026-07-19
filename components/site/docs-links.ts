import {
  ArrowDownUp,
  BookOpen,
  Columns3,
  Download,
  Filter,
  Megaphone,
  MousePointerClick,
  MoveHorizontal,
  Rows3,
  ShoppingCart,
  SquareStack,
  Sigma,
  Undo2,
  Users,
  Wallet,
} from "lucide-react"

export type DocsLink = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  /** Extra terms the search palette should match beyond the label. */
  keywords?: string[]
}

export type DocsGroup = { title: string; items: DocsLink[] }

/** Single source of truth for the docs sidebar AND the ⌘K search palette. */
export const DOCS_GROUPS: DocsGroup[] = [
  {
    title: "Getting Started",
    items: [{ href: "/docs", label: "Overview", icon: BookOpen }],
  },
  {
    title: "Blocks",
    items: [
      { href: "/docs/blocks/financials", label: "Financials", icon: Wallet, keywords: ["transactions", "money", "banking"] },
      { href: "/docs/blocks/crm", label: "CRM", icon: Users, keywords: ["deals", "pipeline", "sales", "contacts"] },
      {
        href: "/docs/blocks/marketing-campaigns",
        label: "Marketing Campaigns",
        icon: Megaphone,
        keywords: ["ads", "roas", "spend"],
      },
      {
        href: "/docs/blocks/reservations",
        label: "Reservations",
        icon: ShoppingCart,
        keywords: ["bookings", "hotel", "calendar"],
      },
    ],
  },
  {
    title: "Features",
    items: [
      { href: "/docs/sorting", label: "Sorting", icon: ArrowDownUp, keywords: ["order", "ascending", "descending"] },
      { href: "/docs/filtering", label: "Filtering", icon: Filter, keywords: ["search", "and", "or", "operators"] },
      {
        href: "/docs/column-management",
        label: "Column Management",
        icon: Columns3,
        keywords: ["hide", "show", "visibility", "freeze", "pin", "sticky"],
      },
      {
        href: "/docs/column-resizing",
        label: "Column Resizing",
        icon: MoveHorizontal,
        keywords: ["width", "drag", "resize"],
      },
      {
        href: "/docs/row-selection",
        label: "Row Selection & Actions",
        icon: MousePointerClick,
        keywords: ["checkbox", "select all", "bulk", "actions"],
      },
      {
        href: "/docs/footer-aggregation",
        label: "Footer & Aggregation",
        icon: Sigma,
        keywords: ["sum", "average", "count", "totals"],
      },
      {
        href: "/docs/copy-paste-undo",
        label: "Copy/Paste & Undo",
        icon: Undo2,
        keywords: ["clipboard", "redo", "excel", "tsv"],
      },
      { href: "/docs/export", label: "Export Data", icon: Download, keywords: ["csv", "download"] },
      {
        href: "/docs/grouping",
        label: "Grouping & Hierarchy",
        icon: Rows3,
        keywords: ["drill down", "pivot", "tree", "expand"],
      },
      {
        href: "/docs/field-types",
        label: "Field Types",
        icon: SquareStack,
        keywords: ["currency", "date", "select", "checkbox", "rating", "email", "phone"],
      },
    ],
  },
]
