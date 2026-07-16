import { CodeBlock } from "@/components/site/code-block"

const TOASTER_CODE = `import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}`

/**
 * Installation-section note for every feature page whose behavior reports
 * through sonner toasts (paste/undo confirmations, export results, action
 * feedback). `shadcn add` installs components/ui/sonner.tsx as a registry
 * dependency but never mounts it — without this step the table still works,
 * its toasts just silently never render, which is exactly the kind of
 * degraded-but-not-obviously-broken state worth a docs callout.
 */
export function ToasterCallout() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        This feature confirms its results with toasts. The install adds{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          components/ui/sonner.tsx
        </code>{" "}
        for you, but the <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{"<Toaster />"}</code>{" "}
        it exports must be mounted once in your root layout — otherwise the table works but its
        feedback never appears.
      </p>
      <CodeBlock code={TOASTER_CODE} filename="app/layout.tsx" />
    </div>
  )
}

/** The same callout, as markdown for each page's copy-page/LLM export. */
export const TOASTER_MARKDOWN = `> Toast feedback requires sonner's \`<Toaster />\` mounted once in your root layout:
> \`\`\`tsx
> import { Toaster } from "@/components/ui/sonner"
> // in RootLayout, next to {children}: <Toaster />
> \`\`\``
