import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import ClientLayout from "./ClientLayout"
import { SessionProvider } from "next-auth/react"
// import Providers from "./providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata = {
  title: "TawBayin",
  description: "Badminton POS App",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>

        <ClientLayout>{children}</ClientLayout>
        </SessionProvider>
      </body>
    </html>
  )
}
