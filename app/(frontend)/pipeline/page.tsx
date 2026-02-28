import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import KanbanBoard from "./kanban_board";
import { User, Prisma } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";
import DataFilters from "../components/data_filters";

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

const DEALS_PER_PAGE = 50;

async function getPaginatedDeals(
  dbUser: AuthUserWithTeam,
  currentPage: number,
  searchParams: {
    q?: string;
    dateRange?: string;
    ownerId?: string;
    sort?: string;
  },
) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const skipAmount = (currentPage - 1) * DEALS_PER_PAGE;

  // 1. Functional Date Filter Resolution
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

  // 2. Functional Multi-Select Owner Filter Resolution
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

      if (authorizedIds.length > 0) {
        return { employeeId: { in: authorizedIds } };
      }
    }
    return getSecureOwnershipFilter(dbUser);
  };

  const dateFilter = resolveDateFilter();
  const ownerFilter = resolveOwnerFilter();

  // 3. Build the comprehensive where clause
  const whereClause: Prisma.DealWhereInput = {
    organizationId: dbUser.organizationId,
    ...ownerFilter,
    ...dateFilter,
    ...(searchParams.q
      ? { name: { contains: searchParams.q, mode: "insensitive" } }
      : {}),
    // Keep the existing logic to hide old Won/Lost deals
    AND: [
      {
        OR: [
          { stage: { notIn: ["WON", "LOST"] } },
          {
            stage: { in: ["WON", "LOST"] },
            updatedAt: { gte: thirtyDaysAgo },
          },
        ],
      },
    ],
  };

  // 4. Dynamic Sorting Logic
  let orderByClause: Prisma.DealOrderByWithRelationInput = {
    updatedAt: "desc",
  };
  if (searchParams.sort) {
    switch (searchParams.sort) {
      case "amount_desc":
        orderByClause = { amount: "desc" };
        break;
      case "amount_asc":
        orderByClause = { amount: "asc" };
        break;
      case "newest":
        orderByClause = { createdAt: "desc" };
        break;
      case "oldest":
        orderByClause = { createdAt: "asc" };
        break;
      case "updated":
        orderByClause = { updatedAt: "desc" };
        break;
    }
  }

  const [deals, totalDeals] = await Promise.all([
    prisma.deal.findMany({
      where: whereClause,
      include: { company: { select: { name: true } } },
      orderBy: orderByClause,
      take: DEALS_PER_PAGE,
      skip: skipAmount,
    }),
    prisma.deal.count({ where: whereClause }),
  ]);

  const totalPages = Math.ceil(totalDeals / DEALS_PER_PAGE);
  return { deals, totalDeals, totalPages };
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    dateRange?: string;
    ownerId?: string;
    sort?: string;
  }>;
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
  const currentPage = parseInt(resolvedParams.page || "1", 10);

  // 🚨 FETCH RAW OWNER OPTIONS FOR THE HYBRID INJECTOR
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

  // 🚨 DEFINE SORT OPTIONS SPECIFIC TO DEALS
  const dealSortOptions = [
    { label: "Recently Updated", value: "updated" },
    { label: "Largest Amount", value: "amount_desc" },
    { label: "Smallest Amount", value: "amount_asc" },
    { label: "Newest Created", value: "newest" },
    { label: "Oldest Created", value: "oldest" },
  ];

  const { deals, totalDeals, totalPages } = await getPaginatedDeals(
    authUser,
    currentPage,
    resolvedParams,
  );

  // Safely build search params to keep filters active during pagination
  const buildPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    Object.entries(resolvedParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", pageNumber.toString());
    return `/pipeline?${params.toString()}`;
  };

  return (
    // Forced height to fit screen perfectly minus header padding
    <div className="p-6 md:p-8 flex flex-col h-[calc(100vh-4rem)] animate-in fade-in duration-500">
      {/* Header - shrink-0 ensures it never gets squished */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deal Pipeline</h1>
          <p className="text-sm text-slate-600 mt-1">
            Showing{" "}
            {deals.length > 0 ? (currentPage - 1) * DEALS_PER_PAGE + 1 : 0} to{" "}
            {Math.min(currentPage * DEALS_PER_PAGE, totalDeals)} of {totalDeals}{" "}
            active opportunities.
          </p>
        </div>
        <Link
          href="/pipeline/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-500/20"
        >
          + New Deal
        </Link>
      </div>

      {/* 🚨 THE UNIVERSAL FILTER COMPONENT (shrink-0 prevents squishing) */}
      <div className="shrink-0 mb-4">
        <DataFilters
          searchPlaceholder="Search deals by name..."
          ownerOptions={ownerOptions}
          sortOptions={dealSortOptions}
        />
      </div>

      {/* Kanban Board Container - flex-1 and min-h-0 forces it to stay inside bounds */}
      <div className="flex-1 min-h-0 bg-slate-100 rounded-xl overflow-hidden">
        {deals.length === 0 && currentPage === 1 ? (
          <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-12 text-center text-slate-400 h-full flex items-center justify-center">
            {Object.keys(resolvedParams).length > 0
              ? "No deals match your current filters. Try clearing them!"
              : "No deals in the pipeline. Time to start prospecting!"}
          </div>
        ) : (
          <KanbanBoard initialDeals={deals} />
        )}
      </div>

      {/* Pagination Controls - shrink-0 keeps it at the bottom */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6 shrink-0">
          {currentPage > 1 ? (
            <Link
              href={buildPageUrl(currentPage - 1)}
              className="px-4 py-2 bg-[#242E3D] text-white text-sm font-semibold rounded-lg border border-slate-700 hover:bg-slate-800 transition shadow-sm"
            >
              &larr; Previous
            </Link>
          ) : (
            <span className="px-4 py-2 bg-[#1E2532] text-slate-600 text-sm font-semibold rounded-lg border border-slate-800 cursor-not-allowed">
              &larr; Previous
            </span>
          )}
          <span className="text-slate-500 text-sm font-medium">
            Page <span className="text-slate-800 font-bold">{currentPage}</span>{" "}
            of {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link
              href={buildPageUrl(currentPage + 1)}
              className="px-4 py-2 bg-[#242E3D] text-white text-sm font-semibold rounded-lg border border-slate-700 hover:bg-slate-800 transition shadow-sm"
            >
              Next &rarr;
            </Link>
          ) : (
            <span className="px-4 py-2 bg-[#1E2532] text-slate-600 text-sm font-semibold rounded-lg border border-slate-800 cursor-not-allowed">
              Next &rarr;
            </span>
          )}
        </div>
      )}
    </div>
  );
}
