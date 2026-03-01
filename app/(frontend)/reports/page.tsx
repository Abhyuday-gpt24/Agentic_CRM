import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import { User, Prisma } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";
import DataFilters from "../components/data_filters";

// ==========================================
// 1. STRICT TYPES & RBAC LOGIC
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

async function getReportData(
  dbUser: AuthUserWithTeam,
  searchParams: { dateRange?: string; ownerId?: string; q?: string },
) {
  const resolveDateFilter = () => {
    if (searchParams.dateRange && searchParams.dateRange !== "ALL") {
      const now = new Date();
      const startDate = new Date();

      if (searchParams.dateRange === "LAST_7_DAYS")
        startDate.setDate(now.getDate() - 7);
      if (searchParams.dateRange === "LAST_30_DAYS")
        startDate.setDate(now.getDate() - 30);
      if (searchParams.dateRange === "THIS_MONTH") startDate.setDate(1);

      return { createdAt: { gte: startDate } };
    }
    return {};
  };

  const resolveOwnerFilter = () => {
    if (searchParams.ownerId && searchParams.ownerId !== "ALL") {
      const requestedIds = searchParams.ownerId.split(",");
      const authorizedIds: string[] = [];

      for (const id of requestedIds) {
        const isRequestingSelf = id === dbUser.id;
        const isRequestingTeamMember = dbUser.teamMembers.some(
          (tm) => tm.id === id,
        );

        if (
          dbUser.role === "ADMIN" ||
          isRequestingSelf ||
          isRequestingTeamMember
        ) {
          authorizedIds.push(id);
        }
      }

      if (authorizedIds.length > 0)
        return { employeeId: { in: authorizedIds } };
    }
    return getSecureOwnershipFilter(dbUser);
  };

  const dateFilter = resolveDateFilter();
  const ownerFilter = resolveOwnerFilter();

  const dealWhere: Prisma.DealWhereInput = {
    organizationId: dbUser.organizationId,
    ...ownerFilter,
    ...dateFilter,
    ...(searchParams.q
      ? { name: { contains: searchParams.q, mode: "insensitive" } }
      : {}),
  };

  const taskWhere: Prisma.TaskWhereInput = {
    organizationId: dbUser.organizationId,
    ...ownerFilter,
    ...dateFilter,
    ...(searchParams.q
      ? { title: { contains: searchParams.q, mode: "insensitive" } }
      : {}),
  };

  const contactWhere: Prisma.ContactWhereInput = {
    organizationId: dbUser.organizationId,
    ...ownerFilter,
    ...dateFilter,
    ...(searchParams.q
      ? { name: { contains: searchParams.q, mode: "insensitive" } }
      : {}),
  };

  return await Promise.all([
    // 🚨 We include Company here so we can analyze Deal Accounts!
    prisma.deal.findMany({
      where: dealWhere,
      include: { company: { select: { type: true } } },
    }),
    prisma.task.findMany({ where: taskWhere }),
    prisma.contact.count({ where: contactWhere }),
  ]);
}

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ dateRange?: string; ownerId?: string; q?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const authUser = dbUser as AuthUserWithTeam;
  const resolvedParams = await searchParams;

  let ownerOptions: { label: string; value: string }[] | undefined = undefined;

  if (authUser.role === "ADMIN" || authUser.role === "MANAGER") {
    ownerOptions = [{ label: "Me Only", value: authUser.id }];
    if (authUser.role === "ADMIN") {
      const allUsers = await prisma.user.findMany({
        where: { organizationId: authUser.organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      ownerOptions = allUsers.map((u) => ({
        label: u.name || "Unknown",
        value: u.id,
      }));
    } else if (authUser.role === "MANAGER") {
      ownerOptions = [
        ...ownerOptions,
        ...authUser.teamMembers.map((u) => ({
          label: u.name || "Unknown",
          value: u.id,
        })),
      ];
    }
  }

  const [deals, tasks, clients] = await getReportData(authUser, resolvedParams);

  // 🚨 SFA Deal Calculations
  let totalRevenue = 0;
  let pipelineValue = 0;
  let expectedPipelineValue = 0; // The new weighted forecast!
  let wonDeals = 0;
  let lostDeals = 0;

  let newBusinessValue = 0;
  let existingBusinessValue = 0;

  // Pipeline Stage Aggregation (Now tracking expected revenue too!)
  const stages = {
    DISCOVERY: { count: 0, value: 0, expected: 0 },
    PROPOSAL: { count: 0, value: 0, expected: 0 },
    NEGOTIATION: { count: 0, value: 0, expected: 0 },
  };

  deals.forEach((deal) => {
    if (deal.stage === "WON") {
      totalRevenue += deal.amount;
      wonDeals++;
    } else if (deal.stage === "LOST") {
      lostDeals++;
    } else {
      pipelineValue += deal.amount;
      expectedPipelineValue += deal.expectedRevenue || 0;

      if (deal.dealType === "NEW_BUSINESS") newBusinessValue += deal.amount;
      if (deal.dealType === "EXISTING_BUSINESS")
        existingBusinessValue += deal.amount;

      // Map active stages
      if (deal.stage in stages) {
        stages[deal.stage as keyof typeof stages].count++;
        stages[deal.stage as keyof typeof stages].value += deal.amount;
        stages[deal.stage as keyof typeof stages].expected +=
          deal.expectedRevenue || 0;
      }
    }
  });

  const totalClosed = wonDeals + lostDeals;
  const winRate =
    totalClosed > 0 ? Math.round((wonDeals / totalClosed) * 100) : 0;

  const completedTasks = tasks.filter((t) => t.isCompleted).length;
  const taskCompletionRate =
    tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const maxStageValue = Math.max(
    ...Object.values(stages).map((s) => s.value),
    1,
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Sales Analytics</h1>
        <p className="text-sm text-slate-600">
          Real-time pipeline health and SFA forecasting.
        </p>
      </div>

      <DataFilters
        searchPlaceholder="Search reports by keyword..."
        ownerOptions={ownerOptions}
      />

      {/* TOP KPIs GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-2">
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-emerald-500/30">
          <p className="text-emerald-400 text-sm font-medium mb-1">
            Closed Won Revenue
          </p>
          <p className="text-3xl font-bold text-white">
            ${totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            From {wonDeals} won deals
          </p>
        </div>

        {/* 🚨 Upgraded Active Pipeline Card */}
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-blue-500/30">
          <p className="text-blue-400 text-sm font-medium mb-1">
            Total Pipeline Value
          </p>
          <p className="text-3xl font-bold text-white">
            ${pipelineValue.toLocaleString()}
          </p>
          <p className="text-xs text-emerald-400 font-bold mt-2 bg-emerald-500/10 px-2 py-1 rounded inline-block">
            Weighted: ${expectedPipelineValue.toLocaleString()}
          </p>
        </div>

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
          <div
            className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-20"
            style={{
              backgroundColor:
                winRate > 50 ? "#10B981" : winRate > 20 ? "#F59E0B" : "#EF4444",
            }}
          />
        </div>

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
        {/* 🚨 PIPELINE FUNNEL WITH FORECASTING */}
        <div className="lg:col-span-2 bg-[#242E3D] p-6 md:p-8 rounded-2xl shadow-lg border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-6">
            Pipeline Funnel & Forecasting
          </h3>

          <div className="space-y-6">
            {Object.entries(stages).map(([stageName, data]) => {
              const widthPct =
                data.value > 0
                  ? Math.max((data.value / maxStageValue) * 100, 5)
                  : 0;
              const expectedWidthPct =
                data.value > 0 ? (data.expected / data.value) * 100 : 0;

              return (
                <div key={stageName}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold text-slate-300">
                      {stageName}
                    </span>
                    <span className="text-sm font-bold text-blue-400">
                      ${data.value.toLocaleString()}
                      <span className="text-xs text-emerald-400/80 font-medium ml-2">
                        (Exp: ${data.expected.toLocaleString()})
                      </span>
                    </span>
                  </div>
                  {/* Outer Bar: Total Value */}
                  <div className="w-full bg-[#1E2532] h-6 rounded-md overflow-hidden relative">
                    <div
                      className="h-full bg-blue-600/50 rounded-md transition-all duration-1000 relative"
                      style={{ width: `${widthPct}%` }}
                    >
                      {/* Inner Bar: Expected Value (Weighted) */}
                      <div
                        className="absolute left-0 top-0 h-full bg-blue-500 rounded-md"
                        style={{ width: `${expectedWidthPct}%` }}
                      />
                      {data.count > 0 && (
                        <span className="absolute left-2 top-[3px] text-[10px] text-white font-medium z-10">
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

        {/* SFA QUICK STATS SIDEBAR */}
        <div className="bg-[#242E3D] p-6 md:p-8 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col gap-6">
          <h3 className="text-lg font-bold text-white">Deal Analytics</h3>

          {/* New vs Existing Breakdown */}
          <div className="space-y-3 mb-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">New Business</span>
              <span className="font-bold text-white">
                ${newBusinessValue.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-[#1E2532] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full"
                style={{
                  width: `${pipelineValue ? (newBusinessValue / pipelineValue) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-sm pt-2">
              <span className="text-slate-400">Existing (Upsell)</span>
              <span className="font-bold text-white">
                ${existingBusinessValue.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-[#1E2532] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-orange-500 h-full"
                style={{
                  width: `${pipelineValue ? (existingBusinessValue / pipelineValue) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-[#1E2532] p-4 rounded-xl border border-slate-700/50 flex items-center justify-between mt-auto">
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
