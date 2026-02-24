import React from "react";

export default function Dashboard() {
  return (
    <div className="p-6 md:p-8 space-y-6 w-full max-w-7xl mx-auto text-slate-200">
      {/* TOP ROW: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sales Card */}
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col justify-between h-40">
          <h3 className="text-sm font-medium text-slate-300">
            Sales This Month
          </h3>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-bold text-emerald-400">$14,500</span>
            <span className="text-emerald-400 text-sm font-semibold flex items-center gap-1 mb-1">
              ↑ 12%
            </span>
          </div>
        </div>

        {/* Deals Card */}
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col justify-between h-40 relative">
          <h3 className="text-sm font-medium text-slate-300">
            Active Deals (This Week)
          </h3>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-bold text-white">24</span>
            <span className="text-slate-400 text-sm">
              Deals
              <br />/ $85,000
            </span>
          </div>
          <span className="absolute bottom-6 right-6 text-2xl font-bold text-red-400">
            18
          </span>
        </div>

        {/* Tasks Card */}
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col justify-between h-40 relative">
          <h3 className="text-sm font-medium text-slate-300">
            Tasks Due Today
          </h3>
          <span className="text-4xl font-bold text-red-400 mt-4">18</span>
          <span className="absolute bottom-6 right-6 text-2xl font-bold text-red-400">
            7
          </span>
        </div>
      </div>

      {/* MIDDLE ROW: Charts */}
      <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[300px]">
        {/* Mock Funnel Chart */}
        <div className="flex flex-col items-center justify-center pt-4">
          <div className="w-full max-w-xs space-y-1 relative">
            <div className="h-10 bg-blue-500 rounded-t-lg flex items-center justify-center text-xs font-bold text-white shadow-sm w-full">
              Discovery (100)
            </div>
            <div className="h-10 bg-orange-400 flex items-center justify-center text-xs font-bold text-white shadow-sm mx-4">
              Proposal (50)
            </div>
            <div className="h-10 bg-green-500 flex items-center justify-center text-xs font-bold text-white shadow-sm mx-8">
              Negotiation (20)
            </div>
            <div className="h-10 bg-cyan-400 rounded-b-lg flex items-center justify-center text-xs font-bold text-white shadow-sm mx-12">
              Won (10)
            </div>
          </div>
        </div>

        {/* Mock Line Chart */}
        <div className="flex flex-col h-full justify-center">
          <h3 className="text-sm font-medium text-slate-300 mb-6">
            Revenue Forecast
          </h3>
          <div className="relative w-full h-40 border-b border-l border-slate-600">
            {/* SVG Line representation matching the image */}
            <svg
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <path
                d="M 0 80 Q 20 80 30 70 T 50 60 T 70 30 T 100 20"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
              />
              {/* Data points */}
              <circle cx="0" cy="80" r="2" fill="#22d3ee" />
              <circle cx="25" cy="75" r="2" fill="#22d3ee" />
              <circle cx="40" cy="65" r="2" fill="#22d3ee" />
              <circle cx="55" cy="55" r="2" fill="#22d3ee" />
              <circle cx="75" cy="25" r="2" fill="#22d3ee" />
              <circle cx="90" cy="15" r="2" fill="#22d3ee" />
              <circle cx="100" cy="15" r="2" fill="#22d3ee" />
            </svg>
            <div className="absolute -left-8 top-0 text-[10px] text-slate-400">
              120%
            </div>
            <div className="absolute -left-8 top-1/2 text-[10px] text-slate-400">
              24%
            </div>
            <div className="absolute -left-6 bottom-4 text-[10px] text-slate-400">
              2%
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-2">
            <span>M</span>
            <span>10</span>
            <span>40</span>
            <span>140</span>
            <span>120</span>
            <span>290</span>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Action & Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Action Center */}
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50">
          <h3 className="text-base font-semibold text-white mb-4">
            Action Center
          </h3>
          <div className="mb-4">
            <h4 className="text-sm text-white font-medium">
              My Agenda for Today
            </h4>
            <span className="text-xs text-slate-400">Due 10 AM</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xs">
                  📞
                </div>
                <span className="text-slate-200">Call Sarah Connor</span>
              </div>
              <span className="text-slate-400 text-xs">Due 10 AM</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                  ✉️
                </div>
                <span className="text-slate-200">Send pricing proposal</span>
              </div>
              <span className="text-slate-400 text-xs">Due 3:00 PM</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs">
                  ✓
                </div>
                <span className="text-slate-200">Zoom meeting</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50">
          <h3 className="text-base font-semibold text-white mb-6">
            Recent Activity
          </h3>

          <div className="relative border-l border-slate-600 ml-2 space-y-6 pb-2">
            <div className="relative pl-4">
              <div className="absolute w-2 h-2 bg-slate-400 rounded-full -left-[5px] top-1.5"></div>
              <p className="text-sm text-slate-300">
                <span className="text-slate-400 text-xs mr-2">10 min ago:</span>
                John Smith opened email
              </p>
            </div>

            <div className="relative pl-4">
              <div className="absolute w-2 h-2 bg-slate-400 rounded-full -left-[5px] top-1.5"></div>
              <p className="text-sm text-slate-300">
                <span className="text-slate-400 text-xs mr-2">2 hour ago:</span>
                Emma added note to Stark Ind.
              </p>
            </div>

            <div className="relative pl-4">
              <div className="absolute w-2 h-2 bg-slate-400 rounded-full -left-[5px] top-1.5"></div>
              <p className="text-sm text-slate-300">
                <span className="text-slate-400 text-xs mr-2">2 hour ago:</span>
                New lead assigned: Bruce Banner
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
