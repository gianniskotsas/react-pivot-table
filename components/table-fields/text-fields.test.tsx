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

  it("urlField renders an external anchor", () => {
    render(<>{urlField().display(ctx("https://example.com"))}</>)
    const a = screen.getByRole("link", { name: "https://example.com" })
    expect(a).toHaveAttribute("href", "https://example.com")
    expect(a).toHaveAttribute("target", "_blank")
    expect(a).toHaveAttribute("rel", "noreferrer")
  })

  it("urlField renders non-http(s) values as plain text, not a link", () => {
    const { container } = render(<>{urlField().display(ctx("javascript:alert(1)"))}</>)
    expect(container.querySelector("a")).toBeNull()
    expect(container.textContent).toBe("javascript:alert(1)")
  })

  it("emailField renders a mailto link and phoneField a tel link", () => {
    render(<>{emailField().display(ctx("a@b.com"))}</>)
    expect(screen.getByRole("link", { name: "a@b.com" })).toHaveAttribute("href", "mailto:a@b.com")
    render(<>{phoneField().display(ctx("+15551234567"))}</>)
    expect(screen.getByRole("link", { name: "+15551234567" })).toHaveAttribute("href", "tel:+15551234567")
  })

  it("round-trips clipboard as identity", () => {
    expect(urlField().toClipboard("x")).toBe("x")
    expect(urlField().fromClipboard("x")).toBe("x")
  })
})
