import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import DealForm from "./deal_form";
import { User } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../../lib/rbac_helpers";

// ==========================================
// 1. STRICT TYPES
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; clientId?: string }>;
}) {
  const { companyId, clientId } = await searchParams;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // 🚨 Fetch User & Team (Required for Manager RBAC)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const authUser = dbUser as AuthUserWithTeam;

  // 🚨 1. Determine Assignable Users for Delegation (Admin/Manager Logic)
  let assignableUsers: { id: string; name: string }[] = [];

  if (authUser.role === "ADMIN") {
    // Admins can assign to anyone in the entire organization
    const allUsers = await prisma.user.findMany({
      where: { organizationId: authUser.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    assignableUsers = allUsers.map((u) => ({
      id: u.id,
      name: u.name || "Unknown User",
    }));
  } else if (authUser.role === "MANAGER") {
    // Managers can assign to themselves or their specific team members
    assignableUsers = [
      { id: authUser.id, name: "Me (Self)" },
      ...authUser.teamMembers.map((u) => ({
        id: u.id,
        name: u.name || "Unknown User",
      })),
    ];
  }

  // 🚨 2. Get the dynamic ownership filter for contacts
  const ownershipFilter = getSecureOwnershipFilter(authUser);

  // Fetch Contacts, Companies, and Products in parallel for better performance
  const [contacts, companies, products] = await Promise.all([
    // Secure the Contacts dropdown so reps only see their own contacts
    prisma.contact.findMany({
      where: {
        organizationId: authUser.organizationId,
        ...ownershipFilter,
      },
      select: { id: true, name: true, companyId: true },
      orderBy: { name: "asc" },
    }),
    // Companies remain organization-wide
    prisma.company.findMany({
      where: { organizationId: authUser.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // Products remain organization-wide
    prisma.product.findMany({
      where: {
        organizationId: authUser.organizationId,
        isActive: true,
      },
      select: { id: true, name: true, price: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/pipeline"
          className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Create New Deal</h1>
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6 md:p-8">
        <DealForm
          contacts={contacts}
          companies={companies}
          products={products}
          initialCompanyId={companyId}
          initialClientId={clientId}
          // 🚨 PASSING DELEGATION PROPS
          assignableUsers={assignableUsers}
          currentUserId={authUser.id}
        />
      </div>
    </div>
  );
}
