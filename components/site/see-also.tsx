import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function SeeAlso({
  links,
}: {
  links: { href: string; label: string }[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
        >
          {link.label}
          <ArrowRight className="size-3" />
        </Link>
      ))}
    </div>
  )
}
