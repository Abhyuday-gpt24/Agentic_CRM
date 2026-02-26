import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import CompanyCard from "./company_card";
import { User } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";

// ==========================================
// 1. STRICT TYPES
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================
export default async function CompaniesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // 🚨 Fetch User & Team (Required for Manager RBAC)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const authUser = dbUser as AuthUserWithTeam;
  const canEdit = authUser.role === "ADMIN" || authUser.role === "MANAGER";

  // 🚨 1. Get the dynamic ownership filter from our central utility
  const ownershipFilter = getSecureOwnershipFilter(authUser);

  // 🚨 2. Fetch shared companies, but filter the nested relationships securely!
  const companies = await prisma.company.findMany({
    where: { organizationId: authUser.organizationId }, // Top-level remains shared
    include: {
      contacts: {
        where: ownershipFilter, // Nested RBAC applied
      },
      deals: {
        where: ownershipFilter, // Nested RBAC applied
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Companies & Accounts
          </h1>
          <p className="text-sm text-slate-500">
            Manage your target organizations and firmographics.
          </p>
        </div>
        <Link
          href="/companies/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          + New Company
        </Link>
      </div>

      {companies.length === 0 ? (
        <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-12 text-center text-slate-400">
          {
            'No accounts found. Click "+ New Company" to add your first target organization!'
          }
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
