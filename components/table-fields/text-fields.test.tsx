import { render, screen } from "@testing-library/react"
import type { CellContext } from "@tanstack/react-table"
import { describe, expect, it } from "vitest"
import {
  emailField,
  longTextField,
  phoneField,
  textField,
  urlField,
} from "./text-fields"

function ctx(value: string): CellContext<unknown, string> {
  return { getValue: () => value } as unknown as CellContext<unknown, string>
}

describe("text fields", () => {
  it("textField renders the raw string", () => {
    const { container } = render(<>{textField().display(ctx("hello"))}</>)
    expect(container.textContent).toBe("hello")
  })

  it("longTextField renders text and truncates via class", () => {
    const { container } = render(<>{longTextField().display(ctx("a long note"))}</>)
    expect(container.textContent).toBe("a long note")
    expect(container.querySelector(".truncate")).not.toBeNull()
  })

  it("urlField renders an external anchor showing the bare hostname", () => {
    render(<>{urlField().display(ctx("https://www.example.com/path"))}</>)
    const a = screen.getByRole("link")
    // Href keeps the full URL; the visible text is the bare hostname (no www.).
    expect(a).toHaveAttribute("href", "https://www.example.com/path")
    expect(a).toHaveAttribute("target", "_blank")
    expect(a).toHaveAttribute("rel", "noreferrer")
    expect(a.textContent).toContain("example.com")
    expect(a.textContent).not.toContain("www.")
  })

  it("urlField renders non-http(s) values as plain text, not a link", () => {
    const { container } = render(<>{urlField().display(ctx("javascript:alert(1)"))}</>)
    expect(container.querySelector("a")).toBeNull()
    expect(container.textContent).toBe("javascript:alert(1)")
  })

  it("emailField renders a mailto link", () => {
    render(<>{emailField().display(ctx("a@b.com"))}</>)
    expect(screen.getByRole("link", { name: "a@b.com" })).toHaveAttribute(
      "href",
      "mailto:a@b.com",
    )
  })

  it("phoneField renders a formatted tel link with a country flag", () => {
    render(<>{phoneField().display(ctx("+14155552671"))}</>)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "tel:+14155552671")
    expect(link.textContent).toContain("🇺🇸")
    expect(link.textContent).toContain("+1 415 555 2671")
  })

  it("phoneField falls back to a raw tel link for unparseable input", () => {
    render(<>{phoneField().display(ctx("+123"))}</>)
    expect(screen.getByRole("link")).toHaveAttribute("href", "tel:+123")
  })

  it("round-trips clipboard as identity", () => {
    expect(urlField().toClipboard("x")).toBe("x")
    expect(urlField().fromClipboard("x")).toBe("x")
  })
})
