"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import LogoutButton from "./auth/logout_button"; // Adjust path if needed

// We pass the dynamic data as props from the Server Layout!
export default function Sidebar({
  orgName,
  userName,
}: {
  orgName?: string;
  userName?: string;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
      label: "Agentic Actions",
      items: [
        {
          name: "AI Chat",
          href: "/frontend",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          ),
        },
      ],
    },
    {
      label: "Pendings",
      items: [
        {
          name: "Follow Ups",
          href: "/frontend?task=follow-ups",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ),
        },
        {
          name: "Quotations",
          href: "/frontend?task=quotations",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          ),
        },
        {
          name: "Emails",
          href: "/frontend?task=emails",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          ),
        },
        {
          name: "Visits",
          href: "/frontend?task=visits",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          ),
        },
      ],
    },
    {
      label: "Sales Pipeline",
      items: [
        {
          name: "Opportunities",
          href: "/frontend?task=opportunities",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          ),
        },
        {
          name: "Win / Lost",
          href: "/frontend?task=win-lost",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
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
                <div className="px-2 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {group.label}
                </div>
              )}
              {group.items.map((item, itemIdx) => {
                const currentTask = searchParams.get("task");
                const isActive = currentTask
                  ? item.href.includes(`task=${currentTask}`)
                  : pathname === item.href && !item.href.includes("?");

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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0 text-white">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            {isOpen && (
              <div className="text-sm font-medium truncate flex-1">
                {userName || "User"}
              </div>
            )}
          </div>
          {/* Logout Button neatly nested inside the sidebar */}
          {isOpen && <LogoutButton />}
        </div>
      </aside>
    </>
  );
}
