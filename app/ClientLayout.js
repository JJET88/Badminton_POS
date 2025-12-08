"use client"

import { Toaster } from "react-hot-toast"
import { ToggleProvider } from "../context/ToggleContext"

export default function ClientLayout({ children }) {
  return (
    <ToggleProvider>
      {children}
      <Toaster reverseOrder={false} />
    </ToggleProvider>
  )
}
