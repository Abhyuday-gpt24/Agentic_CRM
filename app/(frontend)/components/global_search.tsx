"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    // Redirect to a dedicated search results page or just clear
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setIsFocused(false);
  };

  return (
    <div
      ref={searchRef}
      className="relative w-full max-w-[200px] md:w-72 hidden sm:block"
    >
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search workspace..."
          className="w-full bg-[#242E3D] text-sm text-white placeholder-slate-500 rounded-full pl-11 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700 transition-all"
        />
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
      </form>

      {/* QUICK RESULTS DROPDOWN */}
      {isFocused && query.length > 1 && (
        <div className="absolute top-full left-0 mt-2 w-full bg-[#242E3D] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase px-3 py-1">
              Quick Actions
            </p>
            <button
              onClick={() => {
                router.push(`/search?q=${query}`);
                setIsFocused(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2"
            >
              <span className="text-blue-400">🔍</span>{" "}
              {"Search for " + query + '"'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
