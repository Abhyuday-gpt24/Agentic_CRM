import React from "react";

export default function PipelinePage() {
  const stages = ["Discovery", "Proposal", "Negotiation", "Won"];

  return (
    <div className="p-6 md:p-8 h-full flex flex-col w-full animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-slate-800 mb-6 shrink-0">
        Deal Pipeline
      </h1>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {stages.map((stage, i) => (
          <div key={i} className="flex-shrink-0 w-80 flex flex-col gap-4">
            {/* Stage Header */}
            <div className="bg-[#1E2532] px-4 py-3 rounded-xl border border-slate-700/50 flex justify-between items-center shadow-sm">
              <h3 className="font-semibold text-white">{stage}</h3>
              <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full">
                2
              </span>
            </div>

            {/* Mock Deal Cards */}
            <div className="bg-[#242E3D] p-4 rounded-xl shadow-lg border border-slate-700/50 border-l-4 border-l-blue-500 cursor-pointer hover:-translate-y-1 transition-transform">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-white text-sm">
                  Website Redesign
                </h4>
                <span className="text-xs font-bold text-emerald-400">$5k</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Acme Corp • Sarah Connor
              </p>
              <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span>Created 2d ago</span>
                <div className="w-5 h-5 rounded-full bg-slate-600"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
