"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"

export const GITHUB_URL = "https://github.com/gianniskotsas/react-pivot-table"

const GITHUB_API_URL =
  "https://api.github.com/repos/gianniskotsas/react-pivot-table"

function GithubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.74.5 12.04c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56v-2.02c-3.2.7-3.88-1.38-3.88-1.38-.53-1.35-1.3-1.71-1.3-1.71-1.06-.73.08-.72.08-.72 1.17.08 1.79 1.21 1.79 1.21 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.42.37.8 1.1.8 2.22v3.29c0 .31.21.67.8.56A11.55 11.55 0 0 0 23.5 12.04C23.5 5.74 18.27.5 12 .5Z" />
    </svg>
  )
}

function formatStarCount(count: number): string {
  if (count < 1000) return String(count)
  return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`
}

/** Live GitHub star count, degrading to a plain icon button if the fetch fails. */
export function GithubStars() {
  const [stars, setStars] = React.useState<number | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()
    fetch(GITHUB_API_URL, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.stargazers_count === "number") {
          setStars(data.stargazers_count)
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="GitHub repository"
      className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      nativeButton={false}
      render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
    >
      <GithubMark />
      {stars !== null && (
        <span className="text-xs tabular-nums">{formatStarCount(stars)}</span>
      )}
    </Button>
  )
}
