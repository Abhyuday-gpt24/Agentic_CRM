import React from "react";
import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-[#1E2532] text-white h-16 px-6 flex items-center justify-between shadow-sm">
      {/* Search Bar */}
      <div className="relative w-72">
        <svg
          className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search"
          className="w-full bg-white text-sm text-slate-900 placeholder-slate-400 rounded-full pl-11 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-5">
        <button className="bg-white text-slate-900 text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-slate-100 transition-colors flex items-center gap-1 shadow-sm">
          <span className="text-lg leading-none mb-0.5">+</span> Quick Add
        </button>

        <button className="text-slate-300 hover:text-white transition-colors relative">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-[#1E2532]"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden border border-slate-600 cursor-pointer relative">
          {/* Avatar placeholder */}
          <Image
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=e2e8f0"
            alt="User"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </div>
    </header>
  );
}
