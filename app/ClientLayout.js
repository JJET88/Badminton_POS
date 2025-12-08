"use client"

import { Toaster } from "react-hot-toast"
import { ToggleProvider } from "../context/ToggleContext"
import { useRouter } from "next/navigation";
import useAuthStore from "./store/useAuthStore";
import { useEffect } from "react";

export default function ClientLayout({ children }) {
  const { user } = useAuthStore();
    const router = useRouter();
  

  useEffect(() => {
      if (!user) {
        router.replace("/login");
        return;
      }
  
    }, [user, router]);

  return (
    <ToggleProvider>
      
      {children}
      <Toaster reverseOrder={false} />
    </ToggleProvider>
  )
}
