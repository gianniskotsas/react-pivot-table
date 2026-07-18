import { JetBrains_Mono, Outfit, Raleway } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

// Font trio from the Kotsas design system (claude.ai/design): Raleway (body/
// UI), Outfit (display — every heading level, per the system's base.css),
// JetBrains Mono (code/table values/ids). Loaded under their own variable
// names — globals.css's @theme inline resolves --font-sans/--font-display
// from these, so the loaded font and the theme can't silently disagree.
const fontSans = Raleway({ subsets: ["latin"], variable: "--font-raleway" })

const fontDisplay = Outfit({ subsets: ["latin"], variable: "--font-outfit" })

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
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
