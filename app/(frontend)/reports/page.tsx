import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import { User } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";

// ==========================================
// 1. STRICT TYPES & RBAC LOGIC
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

async function getReportData(dbUser: AuthUserWithTeam) {
  // 🚨 1. Get the dynamic ownership filter from our central utility
  const ownershipFilter = getSecureOwnershipFilter(dbUser);

  // 🚨 2. Execute all three secure queries concurrently
  return await Promise.all([
    prisma.deal.findMany({
      where: {
        organizationId: dbUser.organizationId,
        ...ownershipFilter,
      },
    }),
    prisma.task.findMany({
      where: {
        organizationId: dbUser.organizationId,
        ...ownershipFilter,
      },
    }),
    prisma.contact.count({
      where: {
        organizationId: dbUser.organizationId,
        ...ownershipFilter,
      },
    }),
  ]);
}

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================
export default async function ReportsPage() {
  // 1. Authenticate and get User
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // Fetch User & Team (Required for Manager RBAC)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const authUser = dbUser as AuthUserWithTeam;

  // 2. Fetch the dynamically filtered data
  const [deals, tasks, clients] = await getReportData(authUser);

  // 3. Calculate Key Metrics based ONLY on what the user is allowed to see
  let totalRevenue = 0;
  let pipelineValue = 0;
  let wonDeals = 0;
  let lostDeals = 0;

  // Pipeline Stage Aggregation
  const stages = {
    DISCOVERY: { count: 0, value: 0 },
    PROPOSAL: { count: 0, value: 0 },
    NEGOTIATION: { count: 0, value: 0 },
  };

  deals.forEach((deal) => {
    if (deal.stage === "WON") {
      totalRevenue += deal.amount;
      wonDeals++;
    } else if (deal.stage === "LOST") {
      lostDeals++;
    } else {
      pipelineValue += deal.amount;
      // Map active stages
      if (deal.stage in stages) {
        stages[deal.stage as keyof typeof stages].count++;
        stages[deal.stage as keyof typeof stages].value += deal.amount;
      }
    }
  });

  // Calculate Win Rate (Won / Total Closed)
  const totalClosed = wonDeals + lostDeals;
  const winRate =
    totalClosed > 0 ? Math.round((wonDeals / totalClosed) * 100) : 0;

  // Task Completion Rate
  const completedTasks = tasks.filter((t) => t.isCompleted).length;
  const taskCompletionRate =
    tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // Find the highest value stage for the visual funnel scaling
  const maxStageValue = Math.max(
    ...Object.values(stages).map((s) => s.value),
    1,
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-8">
        {/* 🚨 Updated to text-white for dark theme consistency */}
        <h1 className="text-2xl font-bold text-white">Sales Reports</h1>
        <p className="text-sm text-slate-400">
          Real-time analytics and pipeline health.
        </p>
      </div>

      {/* TOP KPIs GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-emerald-500/30">
          <p className="text-emerald-400 text-sm font-medium mb-1">
            Total Closed Revenue
          </p>
          <p className="text-3xl font-bold text-white">
            ${totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            From {wonDeals} won deals
          </p>
        </div>

        {/* Active Pipeline */}
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-blue-500/30">
          <p className="text-blue-400 text-sm font-medium mb-1">
            Active Pipeline Value
          </p>
          <p className="text-3xl font-bold text-white">
            ${pipelineValue.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Potential future revenue
          </p>
        </div>

        {/* Win Rate */}
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-slate-400 text-sm font-medium mb-1">
              Historical Win Rate
            </p>
            <p className="text-3xl font-bold text-white">{winRate}%</p>
            <p className="text-xs text-slate-400 mt-2">
              Against {lostDeals} lost deals
            </p>
          </div>
          {/* Decorative background circle based on win rate */}
          <div
            className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-20"
            style={{
              backgroundColor:
                winRate > 50 ? "#10B981" : winRate > 20 ? "#F59E0B" : "#EF4444",
            }}
          />
        </div>

        {/* Task Completion */}
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50">
          <p className="text-slate-400 text-sm font-medium mb-1">
            Task Completion
          </p>
          <p className="text-3xl font-bold text-white">{taskCompletionRate}%</p>
          <div className="w-full bg-[#1E2532] h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${taskCompletionRate}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PIPELINE FUNNEL (CSS-Based Chart) */}
        <div className="lg:col-span-2 bg-[#242E3D] p-6 md:p-8 rounded-2xl shadow-lg border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-6">
            Pipeline Funnel by Value
          </h3>

          <div className="space-y-6">
            {Object.entries(stages).map(([stageName, data]) => {
              // Calculate width percentage relative to the largest column
              const widthPct =
                data.value > 0
                  ? Math.max((data.value / maxStageValue) * 100, 5)
                  : 0;

              return (
                <div key={stageName}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold text-slate-300">
                      {stageName}
                    </span>
                    <span className="text-sm font-bold text-blue-400">
                      ${data.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-[#1E2532] h-6 rounded-md overflow-hidden relative">
                    <div
                      className="h-full bg-blue-600/80 rounded-md transition-all duration-1000 flex items-center px-2"
                      style={{ width: `${widthPct}%` }}
                    >
                      {data.count > 0 && (
                        <span className="text-[10px] text-white/90 font-medium">
                          {data.count} deals
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* QUICK STATS SIDEBAR */}
        <div className="bg-[#242E3D] p-6 md:p-8 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col gap-6">
          <h3 className="text-lg font-bold text-white">Database Health</h3>

          <div className="bg-[#1E2532] p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
            <span className="text-slate-400 text-sm">Total CRM Contacts</span>
            <span className="text-xl font-bold text-white">{clients}</span>
          </div>

          <div className="bg-[#1E2532] p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
            <span className="text-slate-400 text-sm">Total Deals Tracked</span>
            <span className="text-xl font-bold text-white">{deals.length}</span>
          </div>

          <div className="bg-[#1E2532] p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
            <span className="text-slate-400 text-sm">Avg. Deal Size</span>
            <span className="text-xl font-bold text-emerald-400">
              $
              {deals.length > 0
                ? Math.round(
                    (totalRevenue + pipelineValue) / deals.length,
                  ).toLocaleString()
                : 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
