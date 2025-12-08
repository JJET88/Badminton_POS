"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useAuthStore from "../store/useAuthStore";
import { 
  FiHome, 
  FiPackage, 
  FiShoppingCart, 
  FiTag, 
  FiUsers, 
  FiSettings,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink
} from "react-icons/fi";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 🔐 ADMIN PROTECTION
  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "admin") {
      router.replace("/accessDeny");
    }
  }, [user, router]);

  const menu = [
    { name: "Home", path: "/", icon: FiHome },
    { name: "Dashboard", path: "/dashboard", icon: FiHome },
    { name: "Products", path: "/dashboard/products", icon: FiPackage },
    { name: "View Sales", path: "/dashboard/sales", icon: FiShoppingCart },
    { name: "Voucher", path: "/dashboard/voucher", icon: FiTag },
    { name: "Users", path: "/dashboard/users", icon: FiUsers },
    { name: "Settings", path: "/dashboard/settings", icon: FiSettings },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside
        className={`
          bg-white border-r border-gray-200 transition-all duration-300 z-50
          fixed lg:sticky top-0 h-screen flex flex-col
          ${collapsed ? "lg:w-20" : "lg:w-64"}
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 w-64
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {/* Desktop Toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg hidden lg:flex items-center justify-center transition-colors"
              aria-label="Toggle sidebar"
            >
              {collapsed ? (
                <FiChevronRight className="text-xl text-gray-600" />
              ) : (
                <FiChevronLeft className="text-xl text-gray-600" />
              )}
            </button>

            {/* Title */}
            {!collapsed && (
              <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden transition-colors"
            aria-label="Close menu"
          >
            <FiX className="text-xl text-gray-600" />
          </button>
        </div>

        {/* Go to Home Button */}
        {/* <div className={`p-3 border-b border-gray-200 ${collapsed ? "lg:px-2" : ""}`}>
          <Link
            href="/products"
            onClick={() => setMobileMenuOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all
              bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700
              text-white font-medium shadow-sm hover:shadow-md
              ${collapsed ? "lg:justify-center lg:px-3" : ""}
            `}
            title={collapsed ? "Go to Store" : undefined}
          >
            <FiExternalLink className="text-lg flex-shrink-0" />
            <span className={`${collapsed ? "lg:hidden" : ""}`}>
              Go to Store
            </span>
          </Link>
        </div> */}

        {/* Navigation Menu */}
        <nav className="flex-1 flex flex-col space-y-1 p-3 overflow-y-auto">
          {menu.map((item) => {
            const active = pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-4 px-4 py-3 rounded-lg transition-all
                  ${
                    active
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                  ${collapsed ? "lg:justify-center lg:px-4" : "lg:px-4"}
                `}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={`text-xl flex-shrink-0 ${active ? 'text-white' : 'text-gray-600'}`} />

                {/* Hide text in collapsed mode (desktop only) */}
                <span className={`flex-1 ${collapsed ? "lg:hidden" : ""}`}>
                  {item.name}
                </span>

                {/* Count */}
                {item.count && (
                  <span className={`text-sm ${collapsed ? "lg:hidden" : ""} ${
                    active ? 'text-white' : 'text-gray-600'
                  }`}>
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info (Bottom of sidebar) */}
        {user && !collapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="px-4 py-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                  <p className="text-xs text-gray-600 truncate">{user.email}</p>
                </div>
              </div>
              <span className={`inline-block mt-3 px-2.5 py-1 rounded-full text-xs font-medium ${
                user.role === 'admin' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {user.role?.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Collapsed User Avatar */}
        {user && collapsed && (
          <div className="hidden lg:flex p-4 border-t border-gray-200 justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <FiMenu className="text-xl text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
            <Link
              href="/products"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-green-600"
              aria-label="Go to store"
            >
              <FiExternalLink className="text-xl" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}