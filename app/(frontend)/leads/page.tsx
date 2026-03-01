import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import { User, Prisma, LeadStatus } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";
import DataFilters, { FilterConfig } from "../components/data_filters";
import LeadCard from "./components/lead_card";
import Pagination from "../components/pagination";

// ==========================================
// 1. STRICT TYPES & CONSTANTS
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

const LEADS_PER_PAGE = 24;

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
    leadStatus?: string;
  },
) {
  const skipAmount = (currentPage - 1) * LEADS_PER_PAGE;

  const whereClause: Prisma.ContactWhereInput = {
    organizationId: dbUser.organizationId,
    type: "LEAD",
  };

  if (searchParams.q) {
    whereClause.OR = [
      { name: { contains: searchParams.q, mode: "insensitive" } },
      { firstName: { contains: searchParams.q, mode: "insensitive" } },
      { lastName: { contains: searchParams.q, mode: "insensitive" } },
      { email: { contains: searchParams.q, mode: "insensitive" } },
      { tempCompanyName: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  if (searchParams.leadStatus && searchParams.leadStatus !== "ALL") {
    whereClause.leadStatus = searchParams.leadStatus as LeadStatus;
  }

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

  const [leads, totalLeads] = await Promise.all([
    prisma.contact.findMany({
      where: whereClause,
      include: { companyRecord: { select: { name: true } } },
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
    leadStatus?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");
  const authUser = dbUser as AuthUserWithTeam;

  const resolvedParams = await searchParams;
  const currentPage = parseInt(resolvedParams.page || "1", 10);

  // FETCH RAW OWNER OPTIONS
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

  const leadFilters: FilterConfig[] = [
    {
      key: "leadStatus",
      label: "Lead Status",
      options: [
        { label: "New", value: "NEW" },
        { label: "Attempted Contact", value: "ATTEMPTED_CONTACT" },
        { label: "Engaged", value: "ENGAGED" },
        { label: "Qualified", value: "QUALIFIED" },
        { label: "Unqualified", value: "UNQUALIFIED" },
      ],
    },
  ];

  const leadSortOptions = [
    { label: "Newest First", value: "newest" },
    { label: "Oldest First", value: "oldest" },
    { label: "Name (A-Z)", value: "name_asc" },
    { label: "Name (Z-A)", value: "name_desc" },
    { label: "Recently Updated", value: "updated" },
  ];

  const { leads, totalLeads, totalPages } = await getPaginatedLeads(
    authUser,
    currentPage,
    resolvedParams,
  );

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

      <DataFilters
        searchPlaceholder="Search leads by name, email, or company..."
        filters={leadFilters}
        ownerOptions={ownerOptions}
        sortOptions={leadSortOptions}
      />

      {/* Main Content */}
      {leads.length === 0 ? (
        <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-12 text-center text-slate-400 italic">
          {Object.keys(resolvedParams).length > 0
            ? "No leads match your current filters. Try clearing them!"
            : "Inbox zero! You have no raw leads right now."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leads.map((lead) => {
              // Determine if this specific user is allowed to edit/delete this lead
              const canEdit =
                authUser.role === "ADMIN" ||
                authUser.role === "MANAGER" ||
                lead.employeeId === authUser.id;

              return <LeadCard key={lead.id} lead={lead} canEdit={canEdit} />;
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            buildPageUrl={buildPageUrl}
          />
        </>
      )}
    </div>
  );
}
