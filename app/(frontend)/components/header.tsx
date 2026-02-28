// app/components/header.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSidebar } from "../context/sidebar_context";
import { signOut } from "next-auth/react"; // signOut still works to clear cookies!
import GlobalSearch from "./global_search";

// 🚨 Define the props expected from the Layout
type HeaderProps = {
  user: {
    name: string;
    email: string;
    image: string | null;
  };
};

export default function Header({ user }: HeaderProps) {
  const { isOpen, setIsOpen } = useSidebar();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // 🚨 Use the passed-in prop instead of useSession
  const userImage =
    user.image ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}&backgroundColor=e2e8f0`;

  return (
    <header className="bg-[#1E2532] text-white h-16 px-4 md:px-6 flex items-center justify-between shadow-sm shrink-0 z-40 relative border-b border-slate-700">
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <GlobalSearch />
      </div>

      <div className="flex items-center gap-3 md:gap-5 ml-auto shrink-0">
        {/* ================= QUICK ADD DROPDOWN ================= */}
        <div className="relative">
          <button
            onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-1"
          >
            <span className="md:hidden">+</span>
            <span className="hidden md:inline">+ Quick Add</span>
            <svg
              className={`w-4 h-4 hidden md:block transition-transform duration-200 ${isQuickAddOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isQuickAddOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsQuickAddOpen(false)}
              />
              <div className="absolute right-0 mt-3 w-48 bg-[#242E3D] border border-slate-700 rounded-xl shadow-2xl z-20 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 pb-2 mb-2 border-b border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Create New
                  </p>
                </div>
                <Link
                  href="/leads/new"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-blue-400 transition-colors flex items-center gap-3"
                >
                  <span>👤</span> Lead
                </Link>
                <Link
                  href="/contacts/new"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-blue-400 transition-colors flex items-center gap-3"
                >
                  <span>👥</span> Contact
                </Link>
                <Link
                  href="/companies/new"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-blue-400 transition-colors flex items-center gap-3"
                >
                  <span>🏢</span> Company
                </Link>
                <Link
                  href="/pipeline/new"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-blue-400 transition-colors flex items-center gap-3"
                >
                  <span>💰</span> Deal
                </Link>
                <Link
                  href="/tasks/new"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-blue-400 transition-colors flex items-center gap-3"
                >
                  <span>✅</span> Task
                </Link>
                <Link
                  href="/products/new"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-blue-400 transition-colors flex items-center gap-3 border-t border-slate-700/50 mt-1 pt-3"
                >
                  <span>📦</span> Product
                </Link>
              </div>
            </>
          )}
        </div>

        {/* ================= USER PROFILE DROPDOWN ================= */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-9 h-9 rounded-full bg-slate-700 overflow-hidden border-2 border-slate-600 hover:border-blue-500 transition-all"
          >
            <Image
              src={userImage}
              alt="User"
              fill
              className="object-cover"
              unoptimized
            />
          </button>

          {isProfileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsProfileOpen(false)}
              />
              <div className="absolute right-0 mt-3 w-56 bg-[#242E3D] border border-slate-700 rounded-xl shadow-2xl z-20 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-700/50 mb-1">
                  {/* 🚨 Using the prop here! */}
                  <p className="text-sm font-bold text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {user.email}
                  </p>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span>👤</span> My Profile
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span>⚙️</span> Workspace Settings
                </Link>

                <div className="my-1 border-t border-slate-700/50"></div>

                <button
                  onClick={() => {
                    window.location.href = "/api/auth/signout";
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
