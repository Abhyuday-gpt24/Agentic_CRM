import React from "react";
import type { DealStage } from "@prisma/client";

export type Deal = {
  id: string;
  name: string;
  amount: number;
  stage: string;
  company?: { name: string } | null;
};

type DealCardProps = {
  deal: Deal;
  stage: string;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
  onQuickMove: (dealId: string, newStage: DealStage) => void;
};

export default function DealCard({
  deal,
  stage,
  onDragStart,
  onQuickMove,
}: DealCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      className="bg-[#2A3649] p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-blue-500/50 transition border border-slate-600/50 group relative flex flex-col"
    >
      <div className="text-[10px] text-slate-400 mb-0.5 truncate pr-5">
        {deal.company?.name || "Independent"}
      </div>
      <h4 className="font-semibold text-white text-xs mb-2 pr-5 leading-tight">
        {deal.name}
      </h4>
      <div className="flex justify-between items-center mt-auto">
        <span className="text-emerald-400 font-bold text-xs">
          ${deal.amount.toLocaleString()}
        </span>
      </div>

      {/* Subtle drag handle icon on hover */}
      <div className="absolute top-2.5 right-2.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>

      {/* Quick Move Buttons - Made more compact */}
      {stage !== "WON" && stage !== "LOST" && (
        <div className="flex gap-1.5 pt-2 mt-2 border-t border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onQuickMove(deal.id, "WON")}
            className="flex-1 text-[9px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white py-1 rounded transition"
          >
            Win
          </button>
          <button
            onClick={() => onQuickMove(deal.id, "LOST")}
            className="flex-1 text-[9px] uppercase tracking-wider font-bold bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white py-1 rounded transition"
          >
            Lose
          </button>
        </div>
      )}
    </div>
  );
}
