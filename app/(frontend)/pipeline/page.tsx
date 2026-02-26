import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import KanbanBoard from "./kanban_board";
import { User, Prisma } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";

// ==========================================
// 1. STRICT TYPES & RBAC LOGIC
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

async function getFilteredDeals(dbUser: AuthUserWithTeam) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 🚨 1. Get the dynamic ownership filter from our central utility
  const ownershipFilter = getSecureOwnershipFilter(dbUser);

  // 🚨 2. Execute the securely filtered query
  return await prisma.deal.findMany({
    where: {
      organizationId: dbUser.organizationId,
      // Combine the smart stage logic AND the ownership security
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
        ownershipFilter, // 💥 Instantly secures the deals query
      ],
    },
    include: {
      company: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================
export default async function PipelinePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const authUser = dbUser as AuthUserWithTeam;
  const deals = await getFilteredDeals(authUser);

  return (
    <div className="p-6 md:p-8 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deal Pipeline</h1>
          <p className="text-sm text-slate-600">
            Track and manage your active opportunities.
          </p>
        </div>
        <Link
          href="/pipeline/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-500/20"
        >
          + New Deal
        </Link>
      </div>

      <KanbanBoard initialDeals={deals} />
    </div>
  );
}
