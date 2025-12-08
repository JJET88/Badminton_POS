"use client";

import useAuthStore from "@/app/store/useAuthStore";
import { useRouter } from "next/navigation";

export default function LogoutBtn() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-500 text-white px-4 py-2 rounded"
    >
      Logout
    </button>
  );
}
