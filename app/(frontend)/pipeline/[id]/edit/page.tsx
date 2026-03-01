import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";
import { updateDeal } from "../../../../actions/deals_action";
import DealItemsManager from "../../../components/deal_items_manager";
import { User } from "@prisma/client";

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // 1. Authenticate User & Fetch Team
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");
  const authUser = dbUser as AuthUserWithTeam;

  const resolvedParams = await params;
  const dealId = resolvedParams.id;

  // 2. Fetch the Deal with its Line Items securely
  const deal = await prisma.deal.findUnique({
    where: {
      id: dealId,
      organizationId: authUser.organizationId,
    },
    include: {
      dealItems: true,
      contact: { select: { name: true } },
      company: { select: { name: true } },
    },
  });

  if (!deal) redirect("/pipeline");

  // 3. RBAC Verification
  const isOwner = deal.employeeId === authUser.id;
  const isManager = authUser.role === "ADMIN" || authUser.role === "MANAGER";
  const isTeamMember = authUser.teamMembers.some(
    (tm) => tm.id === deal.employeeId,
  );

  if (!isOwner && !isManager && !isTeamMember) {
    redirect("/pipeline");
  }

  // 🚨 4. Determine Assignable Users for Reassignment
  let assignableUsers: { id: string; name: string }[] = [];

  if (authUser.role === "ADMIN") {
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
    assignableUsers = [
      { id: authUser.id, name: "Me (Self)" },
      ...authUser.teamMembers.map((u) => ({
        id: u.id,
        name: u.name || "Unknown User",
      })),
    ];
  }

  // 5. Fetch the Active Product Catalog
  const catalogProducts = await prisma.product.findMany({
    where: {
      organizationId: authUser.organizationId,
      isActive: true,
    },
    select: { id: true, name: true, price: true },
    orderBy: { name: "asc" },
  });

  // 6. Bind the Server Action
  const updateAction = updateDeal.bind(null, deal.id);

  const formattedCloseDate = deal.closeDate
    ? deal.closeDate.toISOString().split("T")[0]
    : "";

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
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
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Edit Deal</h1>
          <p className="text-sm text-slate-500 mt-1">
            {deal.company?.name ? `${deal.company.name} • ` : ""}
            {deal.contact.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Deal Metadata Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Deal Details</h3>

            <form action={updateAction} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-300 mb-1"
                >
                  Deal Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={deal.name}
                  required
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* 🚨 New Deal Owner Dropdown (Delegation) */}
              {(authUser.role === "ADMIN" || authUser.role === "MANAGER") && (
                <div>
                  <label
                    htmlFor="employeeId"
                    className="block text-sm font-medium text-slate-300 mb-1"
                  >
                    Deal Owner
                  </label>
                  <select
                    id="employeeId"
                    name="employeeId"
                    defaultValue={deal.employeeId}
                    className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  >
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="stage"
                    className="block text-sm font-medium text-slate-300 mb-1"
                  >
                    Pipeline Stage *
                  </label>
                  <select
                    id="stage"
                    name="stage"
                    defaultValue={deal.stage}
                    className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  >
                    <option value="DISCOVERY">Discovery</option>
                    <option value="PROPOSAL">Proposal</option>
                    <option value="NEGOTIATION">Negotiation</option>
                    <option value="WON">Closed Won</option>
                    <option value="LOST">Closed Lost</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="dealType"
                    className="block text-sm font-medium text-slate-300 mb-1"
                  >
                    Deal Type
                  </label>
                  <select
                    id="dealType"
                    name="dealType"
                    defaultValue={deal.dealType || ""}
                    className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  >
                    <option value="">-- Select --</option>
                    <option value="NEW_BUSINESS">New Biz</option>
                    <option value="EXISTING_BUSINESS">Existing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="probability"
                    className="block text-sm font-medium text-slate-300 mb-1"
                  >
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    id="probability"
                    name="probability"
                    min="0"
                    max="100"
                    defaultValue={
                      deal.probability !== null ? deal.probability : ""
                    }
                    className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="closeDate"
                    className="block text-sm font-medium text-slate-300 mb-1"
                  >
                    Close Date
                  </label>
                  <input
                    type="date"
                    id="closeDate"
                    name="closeDate"
                    defaultValue={formattedCloseDate}
                    className="w-full bg-[#1E2532] border border-slate-600 text-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="nextStep"
                  className="block text-sm font-medium text-slate-300 mb-1"
                >
                  Next Step
                </label>
                <input
                  type="text"
                  id="nextStep"
                  name="nextStep"
                  placeholder="What happens next?"
                  defaultValue={deal.nextStep || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Calculated Value Display */}
              <div className="pt-4 border-t border-slate-700/50 mt-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Total Deal Value
                </label>
                <p className="text-2xl font-bold text-white">
                  $
                  {deal.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                  })}
                </p>

                <div className="flex justify-between items-center mt-2 bg-[#1E2532] p-2 rounded-lg border border-slate-700">
                  <span className="text-xs font-medium text-slate-400">
                    Expected Revenue
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    $
                    {(deal.expectedRevenue || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg active:scale-95"
                >
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Deal Items Manager */}
        <div className="lg:col-span-2">
          <DealItemsManager
            dealId={deal.id}
            initialItems={deal.dealItems}
            catalogProducts={catalogProducts}
          />
        </div>
      </div>
    </div>
  );
}
