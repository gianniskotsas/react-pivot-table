import { CopyPageMenu } from "@/components/site/copy-page-menu"
import { InstallTabs } from "@/components/site/install-tabs"
import { PageHeader, Section } from "@/components/site/page-header"
import { SeeAlso } from "@/components/site/see-also"
import { CodeBlock } from "@/components/site/code-block"

const USAGE = `import { defineColumns } from "@/components/data-table"

const col = defineColumns<Row>()

const columns = [
  col.text("name"),
  col.currency("salary", { currency: "USD" }),
  col.checkbox("active"),
]`

const PAGE_MARKDOWN = `# Table Fields

Standalone, type-safe Airtable-style field types — the catalogue behind Data
Table's \`defineColumns\`.

## Installation
\`\`\`
npx shadcn@latest add @kotsas-ui/table-fields
\`\`\`

See the Field Types feature page for the full catalogue of all fifteen
field types, each rendered live.
`

export default function TableFieldsComponentPage() {
  return (
    <div className="max-w-3xl space-y-16">
      <PageHeader
        title="Table Fields"
        actions={
          <CopyPageMenu
            markdown={PAGE_MARKDOWN}
            url="/docs/components/table-fields"
          />
        }
        description="Standalone, type-safe Airtable-style field types — the catalogue behind Data Table's defineColumns."
      />

      <Section
        id="installation"
        title="Installation"
        description="A single build works for both Base UI and Radix shadcn projects."
      >
        <InstallTabs package="@kotsas-ui/table-fields" />
      </Section>

      <Section id="usage" title="Usage">
        <CodeBlock code={USAGE} />
      </Section>

      <Section id="see-also" title="See also">
        <SeeAlso
          links={[
            {
              href: "/docs/field-types",
              label: "Field Types — full catalogue",
            },
          ]}
        />
      </Section>
    </div>
  )
}
