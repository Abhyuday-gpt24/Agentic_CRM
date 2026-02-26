import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import MetricCard from "../components/metric_card";
import RecentDeals from "../components/recent_deals";
import UpcomingTasks from "../components/upcoming_tasks";
import { User, Prisma } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";

// ==========================================
// 1. STRICT TYPES & RBAC LOGIC
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

async function getDashboardData(dbUser: AuthUserWithTeam) {
  // 🚨 1. Get the dynamic ownership filter from our central utility
  const ownershipFilter = getSecureOwnershipFilter(dbUser);

  // 🚨 2. Execute both queries simultaneously for maximum performance
  return await Promise.all([
    prisma.deal.findMany({
      where: {
        organizationId: dbUser.organizationId,
        ...ownershipFilter, // Instantly secures the deals query
      },
      include: { company: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),

    prisma.task.findMany({
      where: {
        organizationId: dbUser.organizationId,
        isCompleted: false, // Dashboard only cares about pending tasks
        ...ownershipFilter, // Instantly secures the tasks query
      },
      include: {
        contact: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);
}

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // Fetch User & Team (Required for Manager RBAC)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/setup");

  // Cast to strict type
  const authUser = dbUser as AuthUserWithTeam;

  // Fetch securely filtered data
  const [deals, tasks] = await getDashboardData(authUser);

  // Business Logic Calculations
  const activeDeals = deals.filter(
    (d) => d.stage !== "WON" && d.stage !== "LOST",
  );
  const pipelineValue = activeDeals.reduce((sum, deal) => sum + deal.amount, 0);
  const wonDeals = deals.filter((d) => d.stage === "WON");
  const revenueValue = wonDeals.reduce((sum, deal) => sum + deal.amount, 0);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = session.user.name?.split(" ")[0] || "there";

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500">
      {/* DASHBOARD HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl  font-bold mb-1 text-foreground">
            {greeting}, {firstName}.
          </h1>
          <p className=" text-slate-600">
            Here is what is happening in your workspace today.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/tasks/new"
            className="bg-[#242E3D] text-slate-300 border border-slate-700 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition active:scale-95"
          >
            + Task
          </Link>
          <Link
            href="/pipeline/new"
            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20 active:scale-95"
          >
            + New Deal
          </Link>
        </div>
      </div>

      {/* METRICS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Active Pipeline"
          value={`$${pipelineValue.toLocaleString()}`}
          subtext={`Across ${activeDeals.length} open opportunities`}
          icon={
            <svg
              className="w-6 h-6 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <MetricCard
          title="Closed Won Revenue"
          value={`$${revenueValue.toLocaleString()}`}
          valueColor="text-emerald-400"
          subtext={`From ${wonDeals.length} successful deals`}
          icon={
            <svg
              className="w-6 h-6 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <MetricCard
          title="Pending Tasks"
          value={tasks.length}
          subtext="Require your attention"
          icon={
            <svg
              className="w-6 h-6 text-orange-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
        />
      </div>

      {/* LISTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentDeals deals={activeDeals.slice(0, 5)} />
        <UpcomingTasks tasks={tasks} />
      </div>
    </div>
  );
}
