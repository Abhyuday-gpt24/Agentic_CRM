import React from "react";

export default function ReportsPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        Analytics & Reports
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 h-80 flex flex-col">
          <h3 className="text-white font-semibold mb-2">Deal Win Rate</h3>
          <p className="text-sm text-slate-400 mb-6">
            Percentage of deals closed won vs lost.
          </p>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-600 rounded-xl text-slate-500">
            [Chart Area]
          </div>
        </div>

        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 h-80 flex flex-col">
          <h3 className="text-white font-semibold mb-2">AI Actions Saved</h3>
          <p className="text-sm text-slate-400 mb-6">
            Time saved by automated AI drafts and updates.
          </p>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-600 rounded-xl text-slate-500">
            [Chart Area]
          </div>
        </div>
      </div>
    </div>
  );
}
