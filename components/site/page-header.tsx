import * as React from "react"

export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="space-y-3 border-b pb-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
          {title}
        </h1>
        {actions ? <div className="shrink-0 pt-1">{actions}</div> : null}
      </div>
      <p className="max-w-2xl text-muted-foreground">{description}</p>
      {children}
    </header>
  )
}

export function Section({
  title,
  id,
  description,
  children,
}: {
  title: string
  id: string
  description?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-xl font-medium tracking-tight">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
