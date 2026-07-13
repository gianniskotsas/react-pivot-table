import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Docs IA moved from component-first to feature-first (2026-07-13):
      // old /docs/data-table and /docs/table-fields covered both feature
      // behavior and install/props reference; that content now lives split
      // across the Features pages and the slimmer Components reference pages.
      {
        source: "/docs/data-table",
        destination: "/docs/components/data-table",
        permanent: true,
      },
      {
        source: "/docs/table-fields",
        destination: "/docs/field-types",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
