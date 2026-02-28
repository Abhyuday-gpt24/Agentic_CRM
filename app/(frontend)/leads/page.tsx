import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import { convertLeadToContact } from "../../actions/contact_action";
import { User, Prisma } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";
import DataFilters from "../components/data_filters";

// ==========================================
// 1. STRICT TYPES & CONSTANTS
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

const LEADS_PER_PAGE = 24; // 🚨 Reset to 24 for production use

// ==========================================
// 2. THE SECURE QUERY ENGINE
// ==========================================
async function getPaginatedLeads(
  dbUser: AuthUserWithTeam,
  currentPage: number,
  searchParams: {
    q?: string;
    dateRange?: string;
    ownerId?: string;
    sort?: string;
  },
) {
  const skipAmount = (currentPage - 1) * LEADS_PER_PAGE;

  // 1. Base Tenant Security (Ensures we only get Leads, not general Contacts)
  const whereClause: Prisma.ContactWhereInput = {
    organizationId: dbUser.organizationId,
    type: "LEAD",
  };

  // 2. Text Search (Name or Email)
  if (searchParams.q) {
    whereClause.OR = [
      { name: { contains: searchParams.q, mode: "insensitive" } },
      { email: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  // 3. Date Filtering
  if (searchParams.dateRange && searchParams.dateRange !== "ALL") {
    const now = new Date();
    const startDate = new Date();

    if (searchParams.dateRange === "LAST_7_DAYS")
      startDate.setDate(now.getDate() - 7);
    if (searchParams.dateRange === "LAST_30_DAYS")
      startDate.setDate(now.getDate() - 30);
    if (searchParams.dateRange === "THIS_MONTH") startDate.setDate(1);

    whereClause.createdAt = { gte: startDate };
  }

  // 4. 🚨 MULTI-SELECT OWNER FILTER + STRICT RBAC VERIFICATION 🚨
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
      whereClause.employeeId = { in: authorizedIds };
    } else {
      Object.assign(whereClause, getSecureOwnershipFilter(dbUser));
    }
  } else {
    Object.assign(whereClause, getSecureOwnershipFilter(dbUser));
  }

  // 5. Dynamic Sorting Logic
  let orderByClause: Prisma.ContactOrderByWithRelationInput = {
    createdAt: "desc",
  };

  if (searchParams.sort) {
    switch (searchParams.sort) {
      case "newest":
        orderByClause = { createdAt: "desc" };
        break;
      case "oldest":
        orderByClause = { createdAt: "asc" };
        break;
      case "name_asc":
        orderByClause = { name: "asc" };
        break;
      case "name_desc":
        orderByClause = { name: "desc" };
        break;
      case "updated":
        orderByClause = { updatedAt: "desc" };
        break;
    }
  }

  // 6. Execute Queries in Parallel
  const [leads, totalLeads] = await Promise.all([
    prisma.contact.findMany({
      where: whereClause,
      orderBy: orderByClause,
      take: LEADS_PER_PAGE,
      skip: skipAmount,
    }),
    prisma.contact.count({
      where: whereClause,
    }),
  ]);

  const totalPages = Math.ceil(totalLeads / LEADS_PER_PAGE);

  return { leads, totalLeads, totalPages };
}

// ==========================================
// 3. MAIN PAGE COMPONENT
// ==========================================
export default async function LeadsPage({
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
  // 1. Auth & RBAC Setup
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");
  const authUser = dbUser as AuthUserWithTeam;

  // 2. Parse URL Params
  const resolvedParams = await searchParams;
  const currentPage = parseInt(resolvedParams.page || "1", 10);

  // 3. 🚨 FETCH RAW OWNER OPTIONS FOR THE HYBRID INJECTOR
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

  // 4. 🚨 DEFINE SORT OPTIONS FOR LEADS
  const leadSortOptions = [
    { label: "Newest First", value: "newest" },
    { label: "Oldest First", value: "oldest" },
    { label: "Name (A-Z)", value: "name_asc" },
    { label: "Name (Z-A)", value: "name_desc" },
    { label: "Recently Updated", value: "updated" },
  ];

  // 5. Fetch the safely paginated and filtered leads
  const { leads, totalLeads, totalPages } = await getPaginatedLeads(
    authUser,
    currentPage,
    resolvedParams,
  );

  // 6. Safely build search params to keep filters active during pagination
  const buildPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();

    Object.entries(resolvedParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    params.set("page", pageNumber.toString());

    return `/leads?${params.toString()}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Raw Leads</h1>
          <p className="text-sm text-slate-600 mt-1">
            Showing{" "}
            {leads.length > 0 ? (currentPage - 1) * LEADS_PER_PAGE + 1 : 0} to{" "}
            {Math.min(currentPage * LEADS_PER_PAGE, totalLeads)} of {totalLeads}{" "}
            leads.
          </p>
        </div>
        <Link
          href="/contacts/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-500/20"
        >
          + Add Lead
        </Link>
      </div>

      {/* 🚨 Filter Component */}
      <DataFilters
        searchPlaceholder="Search leads by name or email..."
        ownerOptions={ownerOptions}
        sortOptions={leadSortOptions}
      />

      {/* Empty State */}
      {leads.length === 0 ? (
        <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-12 text-center text-slate-400 italic">
          {Object.keys(resolvedParams).length > 0
            ? "No leads match your current filters. Try clearing them!"
            : "Inbox zero! You have no raw leads right now."}
        </div>
      ) : (
        <>
          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leads.map((lead) => {
              const convertAction = convertLeadToContact.bind(
                null,
                lead.id,
                undefined,
              );

              return (
                <div
                  key={lead.id}
                  className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col gap-4 group hover:border-slate-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                        {lead.name}
                      </h3>
                      <p className="text-sm text-slate-400">{lead.email}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      Cold Lead
                    </span>
                  </div>

                  {lead.relationshipContext && (
                    <div className="text-xs text-slate-400 bg-[#1E2532] p-3 rounded-lg border border-slate-700/50 line-clamp-2">
                      {lead.relationshipContext}
                    </div>
                  )}

                  <div className="pt-4 mt-auto border-t border-slate-700/50 flex justify-between items-center">
                    <Link
                      href={`/contacts/${lead.id}/edit`}
                      className="text-xs font-medium text-slate-400 hover:text-blue-400 transition"
                    >
                      Edit Details
                    </Link>

                    <form action={convertAction}>
                      <button
                        type="submit"
                        className="text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg transition active:scale-95"
                      >
                        Convert &rarr;
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🚨 Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-10">
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

              <span className="text-slate-400 text-sm font-medium">
                Page <span className="text-white">{currentPage}</span> of{" "}
                {totalPages}
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
        </>
      )}
    </div>
  );
}
