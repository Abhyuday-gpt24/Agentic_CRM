import React from "react";
import type { DealStage, DealType } from "@prisma/client";

// 🚨 UPGRADED: Included SFA forecasting fields in the expected type
export type Deal = {
  id: string;
  name: string;
  amount: number;
  stage: string;
  company?: { name: string } | null;
  probability?: number | null;
  expectedRevenue?: number | null;
  dealType?: string | null;
  nextStep?: string | null;
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
      <div className="flex justify-between items-start mb-0.5">
        <div className="text-[10px] text-slate-400 truncate pr-2">
          {deal.company?.name || "Independent"}
        </div>
        {/* 🚨 SFA Deal Type Badge */}
        {deal.dealType && (
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 whitespace-nowrap">
            {deal.dealType === "NEW_BUSINESS" ? "NEW BIZ" : "EXISTING"}
          </span>
        )}
      </div>

      <h4 className="font-semibold text-white text-xs mb-2 pr-5 leading-tight">
        {deal.name}
      </h4>

      {/* 🚨 SFA Forecasting Data */}
      <div className="flex justify-between items-center mt-auto">
        <div className="flex flex-col">
          <span className="text-emerald-400 font-bold text-xs">
            ${deal.amount.toLocaleString()}
          </span>
          {/* Show Expected Revenue underneath if a probability is set */}
          {deal.expectedRevenue && deal.expectedRevenue !== deal.amount && (
            <span className="text-[9px] text-slate-500 font-medium">
              Exp: ${deal.expectedRevenue.toLocaleString()}
            </span>
          )}
        </div>

        {/* Probability Badge */}
        {deal.probability !== null && deal.probability !== undefined && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              deal.probability >= 80
                ? "bg-green-500/20 text-green-400"
                : deal.probability >= 40
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-orange-500/20 text-orange-400"
            }`}
          >
            {deal.probability}%
          </span>
        )}
      </div>

      {/* 🚨 SFA Next Step Footer */}
      {deal.nextStep && (
        <div className="mt-2 pt-2 border-t border-slate-700/50 text-[10px] text-slate-400 truncate italic">
          <span className="font-semibold text-slate-500 not-italic">Next:</span>{" "}
          {deal.nextStep}
        </div>
      )}

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

      {/* Quick Move Buttons */}
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
