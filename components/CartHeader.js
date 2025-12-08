/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState } from "react";
import useCartStore from "@/app/store/useCartStore";
import useAuthStore from "@/app/store/useAuthStore";
import { CgProfile } from "react-icons/cg";
import { PiShoppingCart } from "react-icons/pi";
import { FiLogOut, FiUser, FiSettings, FiShoppingBag } from "react-icons/fi";

export default function CartHeader({ search, setSearch }) {
  const { carts } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="bg-blue-800 text-white px-8 py-4 flex items-center justify-between shadow-lg">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 text-3xl font-bold hover:opacity-80 transition-opacity">
        <span className="text-4xl">🏸</span> 
        <span className="hidden sm:inline">TawBayin</span>
      </Link>

     

      {/* Right Side Buttons */}
      <div className="flex items-center gap-4">
        
        {/* Cart Button */}
        <Link
          href="/carts"
          className="relative inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-transparent hover:border-green-500 transition-all shadow-sm hover:shadow-md group"
        >
          <PiShoppingCart className="text-2xl text-gray-700 group-hover:text-green-600 transition-colors" />
          
          {/* Badge */}
          {carts.length > 0 && (
            <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[24px] h-6 px-1 text-[11px] font-bold bg-green-500 text-white rounded-full shadow-lg">
              {carts.length > 99 ? '99+' : carts.length}
            </span>
          )}
        </Link>

      	{/* Profile */}
				<div className="relative">
					{isAuthenticated() && user ? (
						<>
							{/* Profile Button */}
							<button
								onClick={() => setShowDropdown(!showDropdown)}
								className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all relative"
							>
								{/* Avatar */}
								<div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md relative">
									{user.name?.charAt(0).toUpperCase() || "U"}

									{/* Small Points Badge (Only if points exist) */}
									{user.points > 0 && (
										<span className="absolute -bottom-1 -right-1 bg-yellow-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
											{user.points}
										</span>
									)}
								</div>

								<span className="hidden md:inline text-sm font-medium">
									{user.name?.split(" ")[0] || "User"}
								</span>

								<svg
									className={`w-4 h-4 transition-transform ${
										showDropdown ? "rotate-180" : ""
									}`}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>

							{/* Dropdown */}
							{showDropdown && (
								<>
									<div
										className="fixed inset-0 z-10"
										onClick={() => setShowDropdown(false)}
									/>

									<div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
										{/* User Info */}
										<div className="px-4 py-3 border-b border-gray-100">
											<p className="text-sm font-medium text-gray-900 truncate">
												{user.name}
											</p>
											<p className="text-xs text-gray-500 truncate">
												{user.email}
											</p>

											{/* Show Points */}
											<p className="text-xs mt-2">
												<span className="font-semibold text-yellow-600">
													⭐ Points:
												</span>{" "}
												<span className="font-bold text-gray-800">
													{user.points ?? 0}
												</span>
											</p>

											{/* Role */}
											<span
												className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
													user.role === "admin"
														? "bg-purple-100 text-purple-700"
														: "bg-blue-100 text-blue-700"
												}`}
											>
												{user.role}
											</span>
										</div>

										{/* Menu Items */}
										<Link
											href={`/userProfile/${user.id}`}
											onClick={() => setShowDropdown(false)}
											className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
										>
											<FiUser className="text-lg" />
											My Profile
										</Link>

										<Link
											href="/purchase-history"
											onClick={() => setShowDropdown(false)}
											className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
										>
											<FiShoppingBag className="text-lg" />
											Purchase History
										</Link>

										{user.role === "admin" && (
											<Link
												href="/dashboard"
												onClick={() => setShowDropdown(false)}
												className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
											>
												<FiSettings className="text-lg" />
												Admin Dashboard
											</Link>
										)}

										<hr className="my-2 border-gray-100" />

										<button
											onClick={() => {
												setShowDropdown(false);
												logout();
											}}
											className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
										>
											<FiLogOut className="text-lg" />
											Logout
										</button>
									</div>
								</>
							)}
						</>
					) : (
						<Link
							href="/login"
							className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-blue-800 font-medium hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
						>
							<CgProfile className="text-xl" />
							<span className="hidden sm:inline">Login</span>
						</Link>
					)}
				</div>
      </div>
    </header>
  );
}