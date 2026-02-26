import React from "react";
import Link from "next/link";
import { Deal, DealStage } from "@prisma/client";

// Define a specific interface for what this component expects.
// This ensures that if you forget to "include" the company in your Prisma query,
// TypeScript will throw an error before you even run the code.
interface RecentDealExtended extends Partial<Deal> {
  id: string;
  name: string;
  amount: number;
  stage: DealStage;
  company: {
    name: string;
  } | null;
}

interface RecentDealsProps {
  deals: RecentDealExtended[];
}

export default function RecentDeals({ deals }: RecentDealsProps) {
  return (
    <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
        <h3 className="font-bold text-white">Recent Opportunities</h3>
        <Link
          href="/pipeline"
          className="text-xs text-blue-400 hover:text-blue-300 transition"
        >
          View Pipeline &rarr;
        </Link>
      </div>

      <div className="p-2 flex-1">
        {deals.length > 0 ? (
          deals.map((deal) => (
            <Link
              key={deal.id}
              href={`/pipeline`} // You could eventually link to a specific deal ID here
              className="flex items-center justify-between p-4 hover:bg-[#1E2532] rounded-xl transition group"
            >
              <div className="min-w-0">
                <h4 className="font-medium text-slate-200 group-hover:text-blue-400 transition truncate">
                  {deal.name}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {deal.company?.name || "Independent"} •
                  <span className="ml-1 uppercase tracking-wider text-[10px] font-bold text-slate-400">
                    {deal.stage}
                  </span>
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <span className="font-bold text-emerald-400">
                  $
                  {deal.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="p-8 text-center text-slate-500 text-sm italic">
            No active deals right now.
          </div>
        )}
      </div>
    </div>
  );
}
