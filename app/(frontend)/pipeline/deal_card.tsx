"use client"; // 🚨 Added this because we need onClick and window.confirm!

import React from "react";
import Link from "next/link";
import type { DealStage, DealType } from "@prisma/client";
import { deleteDeal } from "../../actions/deals_action"; // 🚨 Adjust this path to your actual actions folder!

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
  // 🚨 New handler to confirm and delete
  const handleDelete = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to permanently delete this deal?",
    );
    if (isConfirmed) {
      await deleteDeal(deal.id);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      className="bg-[#2A3649] p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-blue-500/50 transition border border-slate-600/50 relative flex flex-col"
    >
      {/* 🚨 ACTION BUTTONS CLUSTER (Top Right) */}
      <div className="absolute top-2.5 right-2.5 flex gap-1 z-10">
        {/* DELETE BUTTON */}
        <button
          onClick={handleDelete}
          className="p-1.5 bg-slate-700/50 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-md transition-colors active:scale-95"
          aria-label="Delete Deal"
          title="Delete Deal"
        >
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>

        {/* EDIT BUTTON */}
        <Link
          href={`/pipeline/${deal.id}/edit?returnTo=/pipeline`}
          className="p-1.5 bg-slate-700/50 text-slate-300 hover:text-white hover:bg-blue-500 rounded-md transition-colors active:scale-95"
          aria-label="Edit Deal"
          title="Edit Deal"
        >
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
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </Link>
      </div>

      {/* 🚨 Changed pr-8 to pr-16 to make room for BOTH buttons */}
      <div className="flex justify-between items-start mb-0.5 pr-16">
        <div className="text-[10px] text-slate-400 truncate pr-2">
          {deal.company?.name || "Independent"}
        </div>
        {deal.dealType && (
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 whitespace-nowrap">
            {deal.dealType === "NEW_BUSINESS" ? "NEW BIZ" : "EXISTING"}
          </span>
        )}
      </div>

      {/* 🚨 Changed pr-8 to pr-16 */}
      <h4 className="font-semibold text-white text-xs mb-2 pr-16 leading-tight">
        {deal.name}
      </h4>

      {/* SFA Forecasting Data */}
      <div className="flex justify-between items-center mt-auto">
        <div className="flex flex-col">
          <span className="text-emerald-400 font-bold text-xs">
            ${deal.amount.toLocaleString()}
          </span>
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

      {/* SFA Next Step Footer */}
      {deal.nextStep && (
        <div className="mt-2 pt-2 border-t border-slate-700/50 text-[10px] text-slate-400 truncate italic">
          <span className="font-semibold text-slate-500 not-italic">Next:</span>{" "}
          {deal.nextStep}
        </div>
      )}

      {/* Quick Move Buttons */}
      {stage !== "WON" && stage !== "LOST" && (
        <div className="flex gap-1.5 pt-2 mt-2 border-t border-slate-700/50">
          <button
            onClick={() => onQuickMove(deal.id, "WON")}
            className="flex-1 text-[9px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white py-1 rounded transition active:scale-95"
          >
            Win
          </button>
          <button
            onClick={() => onQuickMove(deal.id, "LOST")}
            className="flex-1 text-[9px] uppercase tracking-wider font-bold bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white py-1 rounded transition active:scale-95"
          >
            Lose
          </button>
        </div>
      )}
    </div>
  );
}
