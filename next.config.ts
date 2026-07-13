import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Docs IA moved from component-first to feature-first (2026-07-13):
      // old /docs/data-table covered both feature behavior and install/props
      // reference; that content now lives split across the Features pages.
      {
        source: "/docs/data-table",
        destination: "/docs",
        permanent: true,
      },
      {
        source: "/docs/table-fields",
        destination: "/docs/field-types",
        permanent: true,
      },
      // Components reference section removed (2026-07-13): install/props
      // reference is no longer a standalone page per component — the
      // Overview links out to each Feature page instead.
      {
        source: "/docs/components/data-table",
        destination: "/docs",
        permanent: true,
      },
      {
        source: "/docs/components/grouped-data-table",
        destination: "/docs",
        permanent: true,
      },
      {
        source: "/docs/components/table-fields",
        destination: "/docs/field-types",
        permanent: true,
      },
      // Sorting & Filtering split into two standalone feature pages
      // (2026-07-13) so each is scoped to exactly one concern.
      {
        source: "/docs/sorting-filtering",
        destination: "/docs/sorting",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
