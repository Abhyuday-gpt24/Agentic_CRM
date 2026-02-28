"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type FilterConfig = {
  key: string;
  label: string;
  options: { label: string; value: string }[];
  isMulti?: boolean;
};

export default function DataFilters({
  searchPlaceholder = "Search...",
  filters = [],
  ownerOptions,
  sortOptions,
}: {
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  ownerOptions?: { label: string; value: string }[];
  sortOptions?: { label: string; value: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 🚨 AUTO-BUILD PERMANENT FILTERS SAFELY (Prevents Duplicate Key Warnings)
  const combinedFilters: FilterConfig[] = [...filters];

  // 1. Permanent Date Range Filter (Only add if it doesn't already exist!)
  if (!combinedFilters.some((f) => f.key === "dateRange")) {
    combinedFilters.push({
      key: "dateRange",
      label: "Date Created",
      options: [
        { label: "Last 7 Days", value: "LAST_7_DAYS" },
        { label: "Last 30 Days", value: "LAST_30_DAYS" },
        { label: "This Month", value: "THIS_MONTH" },
      ],
    });
  }

  // 2. Permanent Owner Filter (Multi-Select)
  if (
    ownerOptions &&
    ownerOptions.length > 0 &&
    !combinedFilters.some((f) => f.key === "ownerId")
  ) {
    combinedFilters.push({
      key: "ownerId",
      label: "Owners",
      options: ownerOptions,
      isMulti: true,
    });
  }

  // 3. Permanent Sort By Filter (Single-Select)
  if (
    sortOptions &&
    sortOptions.length > 0 &&
    !combinedFilters.some((f) => f.key === "sort")
  ) {
    combinedFilters.push({
      key: "sort",
      label: "Sort By",
      options: sortOptions,
    });
  }

  // Close custom multi-select dropdowns if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Search (waits 300ms after user stops typing)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm) params.set("q", searchTerm);
      else params.delete("q");

      if (params.get("q") !== searchParams.get("q")) {
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, pathname, router, searchParams]);

  // Standard Single Dropdown Handler
  const handleSingleChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Multi-Select Checkbox Handler
  const handleMultiChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentValues = params.get(key)?.split(",") || [];

    let newValues;
    if (currentValues.includes(value)) {
      newValues = currentValues.filter((v) => v !== value);
    } else {
      newValues = [...currentValues, value];
    }

    if (newValues.length > 0) params.set(key, newValues.join(","));
    else params.delete(key);

    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Clear All Active Filters
  const handleClear = () => {
    setSearchTerm("");
    router.push(pathname);
  };

  const hasActiveFilters = Array.from(searchParams.keys()).some(
    (k) => k !== "page",
  );

  return (
    <div
      className="flex flex-col sm:flex-row gap-4 mb-6 bg-[#242E3D] p-4 rounded-xl border border-slate-700/50 shadow-sm"
      ref={dropdownRef}
    >
      {/* Search Input */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-slate-500"
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
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-4 py-2 bg-[#1E2532] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {combinedFilters.map((filter) => {
          // MULTI-SELECT RENDER (Checkboxes)
          if (filter.isMulti) {
            const selectedArray =
              searchParams.get(filter.key)?.split(",") || [];
            return (
              <div key={filter.key} className="relative">
                <button
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === filter.key ? null : filter.key,
                    )
                  }
                  className="bg-[#1E2532] border border-slate-700 text-slate-300 text-sm rounded-lg px-4 py-2 flex items-center gap-2 hover:border-slate-500 transition-colors"
                >
                  {filter.label}{" "}
                  {selectedArray.length > 0 && `(${selectedArray.length})`}
                  <svg
                    className="w-4 h-4 text-slate-500"
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

                {openDropdown === filter.key && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#1E2532] border border-slate-700 rounded-xl shadow-2xl z-50 py-2">
                    {filter.options.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-[#242E3D] cursor-pointer transition-colors text-sm text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={selectedArray.includes(opt.value)}
                          onChange={() =>
                            handleMultiChange(filter.key, opt.value)
                          }
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // SINGLE-SELECT RENDER (Standard Select Dropdown)
          return (
            <select
              key={filter.key}
              value={searchParams.get(filter.key) || "ALL"}
              onChange={(e) => handleSingleChange(filter.key, e.target.value)}
              className="bg-[#1E2532] border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none pr-8 relative"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: `right 0.5rem center`,
                backgroundRepeat: `no-repeat`,
                backgroundSize: `1.5em 1.5em`,
              }}
            >
              <option value="ALL">
                {/* UX fix for the sorting label */}
                {filter.key === "sort" ? "Default Sort" : `All ${filter.label}`}
              </option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        })}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="text-xs font-semibold text-slate-400 hover:text-red-400 px-3 py-2 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
