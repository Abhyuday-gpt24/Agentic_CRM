import React from "react";
import Link from "next/link";

export default function Pagination({
  currentPage,
  totalPages,
  buildPageUrl,
}: {
  currentPage: number;
  totalPages: number;
  buildPageUrl: (pageNumber: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-4 mt-10">
      {currentPage > 1 ? (
        <Link
          href={buildPageUrl(currentPage - 1)}
          className="px-4 py-2 bg-[#242E3D] text-white text-sm font-semibold rounded-lg border border-slate-700 hover:bg-slate-800 transition shadow-sm"
        >
          &larr; Previous
        </Link>
      ) : (
        <span className="px-4 py-2 bg-[#1E2532] text-slate-600 text-sm font-semibold rounded-lg border border-slate-800 cursor-not-allowed">
          &larr; Previous
        </span>
      )}

      <span className="text-slate-400 text-sm font-medium">
        Page <span className="text-white">{currentPage}</span> of {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={buildPageUrl(currentPage + 1)}
          className="px-4 py-2 bg-[#242E3D] text-white text-sm font-semibold rounded-lg border border-slate-700 hover:bg-slate-800 transition shadow-sm"
        >
          Next &rarr;
        </Link>
      ) : (
        <span className="px-4 py-2 bg-[#1E2532] text-slate-600 text-sm font-semibold rounded-lg border border-slate-800 cursor-not-allowed">
          Next &rarr;
        </span>
      )}
    </div>
  );
}
