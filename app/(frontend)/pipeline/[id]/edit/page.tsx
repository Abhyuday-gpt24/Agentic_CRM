import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";
import { updateDeal } from "../../../../actions/deals_action";
import DealItemsManager from "../../../components/deal_items_manager";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // 1. Authenticate User
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const resolvedParams = await params;
  const dealId = resolvedParams.id;

  // 2. Fetch the Deal with its Line Items securely
  const deal = await prisma.deal.findUnique({
    where: {
      id: dealId,
      organizationId: dbUser.organizationId,
    },
    include: {
      dealItems: true, // We need the attached products!
      contact: { select: { name: true } },
      company: { select: { name: true } },
    },
  });

  if (!deal) redirect("/pipeline");

  // 3. RBAC Verification (Mirroring our secure server actions)
  const isOwner = deal.employeeId === dbUser.id;
  const isManager = dbUser.role === "ADMIN" || dbUser.role === "MANAGER";
  const isTeamMember = dbUser.teamMembers.some(
    (tm) => tm.id === deal.employeeId,
  );

  if (!isOwner && !isManager && !isTeamMember) {
    redirect("/pipeline"); // Unauthorized
  }

  // 4. Fetch the Active Product Catalog for the dropdown
  const catalogProducts = await prisma.product.findMany({
    where: {
      organizationId: dbUser.organizationId,
      isActive: true, // Only allow adding active products to new deals
    },
    select: { id: true, name: true, price: true },
    orderBy: { name: "asc" },
  });

  // 5. Bind the Server Action
  const updateAction = updateDeal.bind(null, deal.id);

  // Format close date for the HTML date input (YYYY-MM-DD)
  const formattedCloseDate = deal.closeDate
    ? deal.closeDate.toISOString().split("T")[0]
    : "";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
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
                  htmlFor="closeDate"
                  className="block text-sm font-medium text-slate-300 mb-1"
                >
                  Expected Close Date
                </label>
                <input
                  type="date"
                  id="closeDate"
                  name="closeDate"
                  defaultValue={formattedCloseDate}
                  className="w-full bg-[#1E2532] border border-slate-600 text-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm [color-scheme:dark]"
                />
              </div>

              {/* Read-Only Grand Total (Calculated by Line Items) */}
              <div className="pt-4 border-t border-slate-700/50 mt-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Calculated Value
                </label>
                <p className="text-2xl font-bold text-emerald-400">
                  $
                  {deal.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Updates automatically via Line Items.
                </p>
              </div>

              <div className="pt-6">
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

        {/* RIGHT COLUMN: The Deal Items Manager */}
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
