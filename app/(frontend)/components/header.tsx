"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useSidebar } from "../context/sidebar_context";
import { useSession, signOut } from "next-auth/react";
import GlobalSearch from "./global_search";

export default function Header() {
  const { isOpen, setIsOpen } = useSidebar();
  const { data: session } = useSession(); // 🚨 Now populates instantly via hydration
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const userImage =
    session?.user?.image ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.name || "User"}&backgroundColor=e2e8f0`;

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
        <button className="bg-blue-600 text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-blue-700 transition-all shadow-lg active:scale-95">
          <span className="hidden md:inline">+ Quick Add</span>
          <span className="md:hidden">+</span>
        </button>

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
                  <p className="text-sm font-bold text-white truncate">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {session?.user?.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
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
