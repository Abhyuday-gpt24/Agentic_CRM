import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import CompanyCard from "./company_card";
import { User, Prisma, AccountType } from "@prisma/client"; // 🚨 Imported AccountType
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";
import DataFilters, { FilterConfig } from "../components/data_filters";
import Pagination from "../components/pagination"; // 🚨 Imported our reusable component!

// ==========================================
// 1. STRICT TYPES & CONSTANTS
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

const COMPANIES_PER_PAGE = 24; // Safe limit to prevent memory crashes

// ==========================================
// 2. THE SECURE QUERY ENGINE
// ==========================================
async function getPaginatedCompanies(
  authUser: AuthUserWithTeam,
  currentPage: number,
  searchParams: {
    q?: string;
    dateRange?: string;
    sort?: string;
    accountType?: string; // 🚨 New SFA Filter
  },
) {
  const ownershipFilter = getSecureOwnershipFilter(authUser);
  const skipAmount = (currentPage - 1) * COMPANIES_PER_PAGE;

  // 1. Base Tenant Security
  const whereClause: Prisma.CompanyWhereInput = {
    organizationId: authUser.organizationId,
  };

  // 2. 🚨 UPGRADED: Text Search (Now includes Name and Ticker Symbol)
  if (searchParams.q) {
    whereClause.OR = [
      { name: { contains: searchParams.q, mode: "insensitive" } },
      { tickerSymbol: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  // 3. 🚨 NEW: Account Type Filtering (SFA Standard)
  if (searchParams.accountType && searchParams.accountType !== "ALL") {
    const validTypes = Object.values(AccountType);
    if (validTypes.includes(searchParams.accountType as AccountType)) {
      whereClause.type = searchParams.accountType as AccountType;
    }
  }

  // 4. Date Filtering
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

  // 5. Dynamic Sorting Logic
  let orderByClause: Prisma.CompanyOrderByWithRelationInput = { name: "asc" }; // Default

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
  const [companies, totalCompanies] = await Promise.all([
    prisma.company.findMany({
      where: whereClause,
      include: {
        contacts: {
          where: ownershipFilter, // Nested RBAC applied
        },
        deals: {
          where: ownershipFilter, // Nested RBAC applied
        },
      },
      orderBy: orderByClause, // Apply the dynamic sort
      take: COMPANIES_PER_PAGE,
      skip: skipAmount,
    }),
    prisma.company.count({
      where: whereClause,
    }),
  ]);

  const totalPages = Math.ceil(totalCompanies / COMPANIES_PER_PAGE);

  return { companies, totalCompanies, totalPages };
}

// ==========================================
// 3. MAIN PAGE COMPONENT
// ==========================================
export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    dateRange?: string;
    sort?: string;
    accountType?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // Fetch User & Team (Required for Manager RBAC)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const authUser = dbUser as AuthUserWithTeam;
  const canEdit = authUser.role === "ADMIN" || authUser.role === "MANAGER";

  // Parse current URL parameters
  const resolvedParams = await searchParams;
  const currentPage = parseInt(resolvedParams.page || "1", 10);

  // 🚨 Add SFA Dynamic Filters for Accounts
  const companyFilters: FilterConfig[] = [
    {
      key: "accountType",
      label: "Account Type",
      options: [
        { label: "Prospect", value: "PROSPECT" },
        { label: "Customer", value: "CUSTOMER" },
        { label: "Partner", value: "PARTNER" },
        { label: "Vendor", value: "VENDOR" },
        { label: "Competitor", value: "COMPETITOR" },
      ],
    },
  ];

  // Define Sort Options for Companies
  const companySortOptions = [
    { label: "Name (A-Z)", value: "name_asc" },
    { label: "Name (Z-A)", value: "name_desc" },
    { label: "Newest First", value: "newest" },
    { label: "Oldest First", value: "oldest" },
    { label: "Recently Updated", value: "updated" },
  ];

  // Fetch the safely paginated and filtered companies
  const { companies, totalCompanies, totalPages } = await getPaginatedCompanies(
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

    return `/companies?${params.toString()}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Companies & Accounts
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Showing{" "}
            {companies.length > 0
              ? (currentPage - 1) * COMPANIES_PER_PAGE + 1
              : 0}{" "}
            to {Math.min(currentPage * COMPANIES_PER_PAGE, totalCompanies)} of{" "}
            {totalCompanies} accounts.
          </p>
        </div>
        <Link
          href="/companies/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
        >
          + New Company
        </Link>
      </div>

      {/* 🚨 Filter Component (Now includes Account Type dropdown!) */}
      <DataFilters
        searchPlaceholder="Search accounts by name or ticker..."
        filters={companyFilters}
        sortOptions={companySortOptions}
      />

      {/* Empty State */}
      {companies.length === 0 ? (
        <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-12 text-center text-slate-400 italic">
          {Object.keys(resolvedParams).length > 0
            ? "No accounts match your current filters. Try clearing them!"
            : 'No accounts found. Click "+ New Company" to add your first target organization!'}
        </div>
      ) : (
        <>
          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                canEdit={canEdit}
              />
            ))}
          </div>

          {/* 🚨 Replaced massive pagination block with our clean component! */}
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
