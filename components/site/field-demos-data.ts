type Category = "Text" | "Numeric" | "Choice" | "Other"

export type FieldDemoMeta = {
  id: string
  category: Category
  name: string
  valueType: string
  description: string
  code: string
}

export const FIELD_DEMOS: FieldDemoMeta[] = [
  {
    id: "text",
    category: "Text",
    name: "Text",
    valueType: "string",
    description: "Single-line text.",
    code: 'col.text("name")',
  },
  {
    id: "long-text",
    category: "Text",
    name: "Long text",
    valueType: "string",
    description: "Multi-line text.",
    code: 'col.longText("notes")',
  },
  {
    id: "url",
    category: "Text",
    name: "URL",
    valueType: "string",
    description: "Renders as a clickable link.",
    code: 'col.url("website")',
  },
  {
    id: "email",
    category: "Text",
    name: "Email",
    valueType: "string",
    description: "Renders as a mailto: link.",
    code: 'col.email("email")',
  },
  {
    id: "phone",
    category: "Text",
    name: "Phone",
    valueType: "string",
    description: "Renders as a tel: link, formatted via libphonenumber-js.",
    code: 'col.phone("phone")',
  },
  {
    id: "number",
    category: "Numeric",
    name: "Number",
    valueType: "number",
    description:
      "Intl-formatted number. Options: locale?, maximumFractionDigits?",
    code: 'col.number("hoursLogged", { maximumFractionDigits: 1 })',
  },
  {
    id: "currency",
    category: "Numeric",
    name: "Currency",
    valueType: "number",
    description:
      "Intl currency formatting. Options: currency? (default USD), locale?",
    code: 'col.currency("budget", { currency: "USD" })',
  },
  {
    id: "percent",
    category: "Numeric",
    name: "Percent",
    valueType: "number",
    description: "Renders a fraction (0.42) as a percentage (42%).",
    code: 'col.percent("completion")',
  },
  {
    id: "duration",
    category: "Numeric",
    name: "Duration",
    valueType: "number",
    description:
      'Renders a duration in seconds/ms, e.g. "1h 30m". Options: unit?, maxUnits?',
    code: 'col.duration("timeSpent")',
  },
  {
    id: "single-select",
    category: "Choice",
    name: "Single select",
    valueType: "string",
    description:
      "One value from a fixed option list, rendered as a colored chip.",
    code: 'col.singleSelect("priority", {\n  options: [\n    { label: "Low", value: "low" },\n    { label: "High", value: "high" },\n  ],\n})',
  },
  {
    id: "multi-select",
    category: "Choice",
    name: "Multi select",
    valueType: "string[]",
    description: "Multiple values from a fixed option list, rendered as chips.",
    code: 'col.multiSelect("tags", { options })',
  },
  {
    id: "checkbox",
    category: "Choice",
    name: "Checkbox",
    valueType: "boolean",
    description: "A checkbox cell.",
    code: 'col.checkbox("completed")',
  },
  {
    id: "rating",
    category: "Other",
    name: "Rating",
    valueType: "number",
    description: "A star rating. Options: max? (default 5)",
    code: 'col.rating("score")',
  },
  {
    id: "date",
    category: "Other",
    name: "Date",
    valueType: "Date | string",
    description:
      "A formatted date, optionally with time. Options: withTime?, locale?",
    code: 'col.date("dueDate")',
  },
  {
    id: "button",
    category: "Other",
    name: "Button",
    valueType: "—",
    description:
      "An action column (no data accessor) that renders a button and calls onClick(row).",
    code: 'col.button("action", { label: "View", onClick: (row) => {} })',
  },
]
