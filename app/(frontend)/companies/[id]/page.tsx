import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import { User } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../../lib/rbac_helpers";

// ==========================================
// 1. STRICT TYPES
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

export default async function CompanyViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // 🚨 Fetch User & Team (Required for Manager RBAC)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const authUser = dbUser as AuthUserWithTeam;

  // 🚨 2. Get the dynamic ownership filter
  const ownershipFilter = getSecureOwnershipFilter(authUser);

  // 🚨 3. Fetch the specific company but SECURE the nested data
  const company = await prisma.company.findUnique({
    where: {
      id: id,
      organizationId: authUser.organizationId,
    },
    include: {
      contacts: {
        where: ownershipFilter, // 💥 Nested RBAC: Only see allowed contacts
        orderBy: { name: "asc" },
      },
      deals: {
        where: ownershipFilter, // 💥 Nested RBAC: Only see allowed deals
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!company) {
    return (
      <div className="p-8 text-center text-slate-400">
        {"Account not found or you don't have permission to view it."}
      </div>
    );
  }

  // Calculate quick stats based ONLY on allowed data
  const totalPipeline = company.deals
    .filter((d) => d.stage !== "WON" && d.stage !== "LOST")
    .reduce((sum, deal) => sum + deal.amount, 0);

  const totalRevenue = company.deals
    .filter((d) => d.stage === "WON")
    .reduce((sum, deal) => sum + deal.amount, 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* HEADER: Navigation and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/companies"
            className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
            title="Back to Companies"
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
            <h1 className="text-2xl font-bold text-slate-800">
              {company.name}
            </h1>
            <div className="text-sm text-slate-500 flex gap-2 items-center mt-1">
              {company.industry && <span>{company.industry}</span>}
              {company.industry && company.employeeCount && <span>•</span>}
              {company.employeeCount && (
                <span>{company.employeeCount} employees</span>
              )}
              {company.website && (
                <>
                  <span>•</span>
                  <a
                    href={
                      company.website.startsWith("http")
                        ? company.website
                        : `https://${company.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {company.website}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow border border-slate-700/50">
          <p className="text-slate-400 text-sm mb-1">Total Contacts</p>
          <p className="text-2xl font-bold text-white">
            {company.contacts.length}
          </p>
        </div>
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow border border-slate-700/50">
          <p className="text-slate-400 text-sm mb-1">Active Pipeline</p>
          <p className="text-2xl font-bold text-blue-400">
            ${totalPipeline.toLocaleString()}
          </p>
        </div>
        <div className="bg-[#242E3D] p-6 rounded-2xl shadow border border-slate-700/50">
          <p className="text-slate-400 text-sm mb-1">Closed Revenue</p>
          <p className="text-2xl font-bold text-emerald-400">
            ${totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Associated Contacts */}
        <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-white">
              Contacts at {company.name}
            </h3>
            <Link
              href="/contacts/new"
              className="text-xs text-blue-400 hover:text-blue-300 transition"
            >
              + Add Contact
            </Link>
          </div>

          {company.contacts.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm border-2 border-dashed border-slate-700 rounded-xl">
              No contacts linked to this account yet.
            </div>
          ) : (
            <div className="space-y-3">
              {company.contacts.map((client) => (
                <Link
                  href={`/contacts/${client.id}`}
                  key={client.id}
                  className="block bg-[#1E2532] border border-slate-700 p-4 rounded-xl hover:border-blue-500/50 transition group"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-slate-200 text-sm group-hover:text-blue-400 transition">
                        {client.name}
                      </h4>
                      <p className="text-xs text-slate-500">{client.email}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${client.status === "ACTIVE" || client.status === "WON" ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"}`}
                    >
                      {client.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Associated Deals */}
        <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-white">
              Deals & Opportunities
            </h3>
          </div>

          {company.deals.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm border-2 border-dashed border-slate-700 rounded-xl">
              No active deals. Time to start selling!
            </div>
          ) : (
            <div className="space-y-3">
              {company.deals.map((deal) => {
                const isWon = deal.stage === "WON";
                const isLost = deal.stage === "LOST";

                return (
                  <div
                    key={deal.id}
                    className="bg-[#1E2532] border border-slate-700 p-4 rounded-xl"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-slate-200 text-sm">
                        {deal.name}
                      </h4>
                      <span className="text-sm font-bold text-white">
                        ${deal.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          isWon
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isLost
                              ? "bg-red-500/20 text-red-400"
                              : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {deal.stage}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(deal.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
