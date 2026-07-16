import { Geist, Geist_Mono, Newsreader } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

// Loaded under its own variable name (not --font-sans directly): globals.css's
// @theme inline owns --font-sans and resolves it from this variable, so the
// two can't silently disagree. (They used to: the theme said "Geist" while the
// layout loaded Inter — Geist was never loaded, so the whole site rendered in
// the OS fallback font and Inter downloaded as dead weight.)
const fontSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// Editorial display serif for page-level headings only (hero, PageHeader h1) —
// UI-level headings (dialogs, sheets, section titles) stay on the sans.
const fontDisplay = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        "font-sans",
        fontSans.variable,
        fontMono.variable,
        fontDisplay.variable
      )}
    >
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
