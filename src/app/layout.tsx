import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/providers/theme-provider"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FinanceAI — Personal Finance Assistant",
  description: "AI-powered personal finance companion",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="h-full antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                backdropFilter: "blur(16px)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
