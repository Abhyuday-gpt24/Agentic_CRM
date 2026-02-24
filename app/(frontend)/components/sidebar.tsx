"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./auth/logout_button"; // Adjust path if needed

// We pass the dynamic data as props from the Server Layout!
export default function Sidebar({
  orgName,
}: {
  orgName?: string;
  userName?: string;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      }
    }
    // Set initial state based on window size
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menuGroups = [
    {
      label: "Workspace",
      items: [
        {
          name: "Dashboard",
          href: "/",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          ),
        },
      ],
    },
    {
      label: "Core CRM",
      items: [
        {
          name: "Contacts / Leads",
          href: "/contacts",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          ),
        },
        {
          name: "Companies / Accounts",
          href: "/companies",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          ),
        },
        {
          name: "Pipeline / Deals",
          href: "/pipeline",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          ),
        },
        {
          name: "Products",
          href: "/products",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          ),
        },
      ],
    },
    {
      label: "Productivity",
      items: [
        {
          name: "Tasks / Activities",
          href: "/tasks",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ),
        },
        {
          name: "Reports",
          href: "/reports",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          ),
        },
      ],
    },
    {
      label: "System",
      items: [
        {
          name: "Settings",
          href: "/settings",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          ),
        },
      ],
    },
  ];

  return (
    <>
      {/* 1. Mobile Spacer */}
      <div className="w-16 shrink-0 md:hidden" aria-hidden="true" />

      {/* 2. Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 3. The Sidebar */}
      <aside
        className={`
          fixed md:relative top-0 left-0 h-full bg-slate-900 text-slate-50
          transition-all duration-300 ease-in-out flex flex-col z-50
          ${isOpen ? "w-64 shadow-2xl md:shadow-none" : "w-16 -translate-x-full md:translate-x-0"}
        `}
      >
        {/* Sidebar Header & Toggle */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          {isOpen && (
            <div className="flex flex-col overflow-hidden tracking-tight">
              <span className="font-semibold text-lg whitespace-nowrap">
                Agentic CRM
              </span>
              {/* Dynamic Org Name */}
              <span className="text-xs text-slate-400 truncate">
                {orgName || "Setup Required"}
              </span>
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-md hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Toggle Sidebar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 py-4 flex flex-col gap-6 overflow-y-auto overflow-x-hidden scrollbar-hide px-2">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="flex flex-col gap-1">
              {isOpen && (
                <div className="px-2 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-2">
                  {group.label}
                </div>
              )}
              {group.items.map((item, itemIdx) => {
                // Determine active state purely by routing paths
                const isActive =
                  item.href === "/"
                    ? pathname === "/" // Exact match for home dashboard
                    : pathname.startsWith(item.href); // Starts with for sub-routes

                return (
                  <Link
                    key={itemIdx}
                    href={item.href}
                    title={!isOpen ? item.name : undefined}
                    onClick={() => window.innerWidth < 768 && setIsOpen(false)}
                    className={`flex items-center gap-4 px-2 py-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <svg
                      className="w-5 h-5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {item.icon}
                    </svg>
                    {isOpen && (
                      <span className="whitespace-nowrap font-medium text-sm">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile / Bottom Section */}
        <div className="p-4 border-t border-slate-800 flex flex-col gap-4">
          {/* Logout Button neatly nested inside the sidebar */}
          {isOpen && <LogoutButton />}
        </div>
      </aside>
    </>
  );
}
