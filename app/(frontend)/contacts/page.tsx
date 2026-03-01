import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import Link from "next/link";
import ContactCard from "./contact_card";
import { User, Prisma, ContactType } from "@prisma/client";
import DataFilters, { FilterConfig } from "../components/data_filters";
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";
import Pagination from "../components/pagination"; // 🚨 Imported our new reusable component!

// ==========================================
// 1. STRICT TYPES & CONSTANTS
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

const CONTACTS_PER_PAGE = 24;

// ==========================================
// 2. THE SECURE QUERY ENGINE
// ==========================================
async function getFilteredContacts(
  dbUser: AuthUserWithTeam,
  currentPage: number,
  searchParams: {
    q?: string;
    type?: string;
    dateRange?: string;
    ownerId?: string;
  },
) {
  // 1. Base Tenant Security
  const whereClause: Prisma.ContactWhereInput = {
    organizationId: dbUser.organizationId,
  };

  // 2. 🚨 UPGRADED: Text Search (Now includes SFA split names)
  if (searchParams.q) {
    whereClause.OR = [
      { name: { contains: searchParams.q, mode: "insensitive" } },
      { firstName: { contains: searchParams.q, mode: "insensitive" } },
      { lastName: { contains: searchParams.q, mode: "insensitive" } },
      { email: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  // 3. Contact Type Filter
  if (searchParams.type && searchParams.type !== "ALL") {
    const validTypes = Object.values(ContactType);
    if (validTypes.includes(searchParams.type as ContactType)) {
      whereClause.type = searchParams.type as ContactType;
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

  // 5. MULTI-SELECT OWNER FILTER + STRICT RBAC VERIFICATION
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

  // 6. Execute Paginated Query
  const skipAmount = (currentPage - 1) * CONTACTS_PER_PAGE;
  const [contacts, totalContacts] = await Promise.all([
    prisma.contact.findMany({
      where: whereClause,
      include: { companyRecord: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: CONTACTS_PER_PAGE,
      skip: skipAmount,
    }),
    prisma.contact.count({ where: whereClause }),
  ]);

  return {
    contacts,
    totalContacts,
    totalPages: Math.ceil(totalContacts / CONTACTS_PER_PAGE),
  };
}

// ==========================================
// 3. MAIN PAGE COMPONENT
// ==========================================
export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    type?: string;
    dateRange?: string;
    ownerId?: string;
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

  // 🚀 DYNAMIC FILTER GENERATION
  const dynamicFilters: FilterConfig[] = [
    {
      key: "type",
      label: "Contact Type",
      options: [
        { label: "Customer", value: "CUSTOMER" },
        { label: "Partner", value: "PARTNER" },
        { label: "Vendor", value: "VENDOR" },
      ],
    },
    {
      key: "dateRange",
      label: "Date Created",
      options: [
        { label: "Last 7 Days", value: "LAST_7_DAYS" },
        { label: "Last 30 Days", value: "LAST_30_DAYS" },
        { label: "This Month", value: "THIS_MONTH" },
      ],
    },
  ];

  // 🚨 Add RBAC Owner Dropdown for Admins and Managers Only
  if (authUser.role === "ADMIN" || authUser.role === "MANAGER") {
    let ownerOptions = [{ label: "Me Only", value: authUser.id }];

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
        { label: "Me Only", value: authUser.id },
        ...authUser.teamMembers.map((u) => ({
          label: u.name || "Unknown",
          value: u.id,
        })),
      ];
    }

    dynamicFilters.push({
      key: "ownerId",
      label: authUser.role === "MANAGER" ? "My Team" : "Owners",
      options: ownerOptions,
      isMulti: true,
    });
  }

  const { contacts, totalContacts, totalPages } = await getFilteredContacts(
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

    return `/contacts?${params.toString()}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Master Directory
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Showing{" "}
            {contacts.length > 0
              ? (currentPage - 1) * CONTACTS_PER_PAGE + 1
              : 0}{" "}
            to {Math.min(currentPage * CONTACTS_PER_PAGE, totalContacts)} of{" "}
            {totalContacts} contacts.
          </p>
        </div>
        <Link
          href="/contacts/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
        >
          + Add Person
        </Link>
      </div>

      <DataFilters
        searchPlaceholder="Search contacts by name or email..."
        filters={dynamicFilters}
      />

      {contacts.length === 0 ? (
        <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-12 text-center text-slate-400 italic">
          {Object.keys(resolvedParams).length > 0
            ? "No contacts match your current filters. Try clearing them!"
            : 'Your Rolodex is empty! Click "+ Add Person" to get started.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.map((contact) => {
              const canEdit =
                authUser.role === "ADMIN" ||
                authUser.role === "MANAGER" ||
                contact.employeeId === authUser.id;

              return (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  canEdit={canEdit}
                />
              );
            })}
          </div>

          {/* 🚨 Replaced 30 lines of code with our reusable component! */}
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
