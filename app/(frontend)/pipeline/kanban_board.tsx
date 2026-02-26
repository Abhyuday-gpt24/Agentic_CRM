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
    // Added custom scrollbar styling directly in Tailwind
    <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[600px] items-start [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
      {STAGES.map((stage) => {
        const columnDeals = deals.filter((deal) => deal.stage === stage);
        const columnTotal = columnDeals.reduce(
          (sum, deal) => sum + deal.amount,
          0,
        );

        return (
          <div
            key={stage}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
            // 🚨 THE FIX: Replaced w-80 with flex-1 min-w-[240px]
            className="flex flex-col bg-[#1E2532] rounded-xl border border-slate-700/50 flex-1 min-w-[240px] max-w-[320px] shrink-0 shadow-lg h-full max-h-[75vh]"
          >
            {/* Column Header - Compact */}
            <div className="p-3 border-b border-slate-700/50 flex justify-between items-center bg-[#242E3D] rounded-t-xl">
              <h3 className="font-bold text-slate-300 text-xs tracking-wide">
                {stage}
              </h3>
              <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                $
                {columnTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>

            {/* Column Body / Drop Zone - Tighter spacing */}
            <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5 min-h-[150px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
              {columnDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  stage={stage}
                  onDragStart={handleDragStart}
                  onQuickMove={handleQuickMove}
                />
              ))}

              {/* Empty state visual target - Now much smaller! */}
              {columnDeals.length === 0 && (
                <div className="text-center py-4 text-slate-600 text-[10px] uppercase tracking-wider font-semibold border-2 border-dashed border-slate-700/50 rounded-lg">
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
