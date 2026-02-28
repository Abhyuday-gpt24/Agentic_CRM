"use client";

import React, { useState } from "react";
import type { DealStage } from "@prisma/client";
import { updateDealStage } from "../../actions/deals_action";
import DealCard, { Deal } from "./deal_card";

const STAGES: DealStage[] = [
  "DISCOVERY",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export default function KanbanBoard({
  initialDeals,
}: {
  initialDeals: Deal[];
}) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("dealId", dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStage: DealStage) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("dealId");
    await updateStageOptimistically(dealId, newStage);
  };

  const handleQuickMove = async (dealId: string, newStage: DealStage) => {
    await updateStageOptimistically(dealId, newStage);
  };

  const updateStageOptimistically = async (
    dealId: string,
    newStage: DealStage,
  ) => {
    setDeals((currentDeals) =>
      currentDeals.map((deal) =>
        deal.id === dealId ? { ...deal, stage: newStage } : deal,
      ),
    );

    try {
      await updateDealStage(dealId, newStage);
    } catch (error) {
      console.error("Failed to update deal stage:", error);
      setDeals(initialDeals);
    }
  };

  return (
    // 🚨 1. Outer Container: Takes full height, scrolls horizontally
    <div className="flex gap-6 h-full overflow-x-auto pb-4 items-start [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent px-1">
      {STAGES.map((stage) => {
        const columnDeals = deals.filter((deal) => deal.stage === stage);
        const columnTotal = columnDeals.reduce(
          (sum, deal) => sum + deal.amount,
          0,
        );

        return (
          // 🚨 2. The Column: max-h-full forces it to respect the screen height
          <div
            key={stage}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
            className="flex flex-col flex-shrink-0 w-[320px] max-h-full bg-[#1E2532] rounded-2xl border border-slate-700 shadow-xl"
          >
            {/* Column Header - Locks to the top */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#242E3D] rounded-t-2xl shrink-0">
              <h3 className="font-bold text-slate-200 text-xs tracking-widest uppercase">
                {stage}
              </h3>
              <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                $
                {columnTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>

            {/* 🚨 3. Column Body: This is the ONLY part that scrolls vertically! */}
            <div className="p-3 flex-1 overflow-y-auto space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
              {columnDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  stage={stage}
                  onDragStart={handleDragStart}
                  onQuickMove={handleQuickMove}
                />
              ))}

              {/* Enhanced Empty Drop Zone */}
              <div className="h-24 w-full rounded-xl border-2 border-dashed border-slate-600 bg-[#242E3D]/30 flex items-center justify-center transition-colors hover:border-blue-500 hover:bg-blue-500/5">
                <span className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                  Drop Here
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
