import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import { User, AccountType } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../../lib/rbac_helpers";

// ==========================================
// 1. STRICT TYPES & HELPERS
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

function getTypeColor(type: string) {
  switch (type) {
    case "CUSTOMER":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "PROSPECT":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "PARTNER":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "VENDOR":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "COMPETITOR":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

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

  // Build a clean location string from the billing fields
  const locationParts = [
    company.billingCity,
    company.billingState,
    company.billingCountry,
  ].filter(Boolean);
  const locationString = locationParts.join(", ");

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* HEADER: Navigation and Actions */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <Link
            href="/companies"
            className="p-2 bg-[#242E3D] hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg transition mt-1"
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
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{company.name}</h1>

              {/* 🚨 New SFA Fields: Ticker & Account Type */}
              {company.tickerSymbol && (
                <span className="text-xs font-mono bg-slate-700/50 border border-slate-600 text-slate-300 px-2 py-1 rounded">
                  ${company.tickerSymbol.toUpperCase()}
                </span>
              )}
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${getTypeColor(company.type)}`}
              >
                {company.type}
              </span>
            </div>

            {/* 🚨 Firmographics Data Row */}
            <div className="text-sm text-slate-400 flex flex-wrap gap-x-3 gap-y-1 items-center mt-2">
              {company.industry && <span>{company.industry}</span>}
              {company.industry && company.employeeCount && <span>•</span>}
              {company.employeeCount && (
                <span>{company.employeeCount} employees</span>
              )}
              {company.employeeCount && company.annualRevenue && <span>•</span>}
              {company.annualRevenue && (
                <span>
                  ${(company.annualRevenue / 1000000).toFixed(1)}M Revenue
                </span>
              )}
            </div>

            {/* 🚨 Contact Info Row */}
            <div className="text-sm text-slate-400 flex flex-wrap gap-x-3 gap-y-1 items-center mt-1">
              {locationString && (
                <span className="flex items-center gap-1">
                  📍 {locationString}
                </span>
              )}
              {locationString && company.phone && <span>•</span>}
              {company.phone && (
                <span className="flex items-center gap-1">
                  📞 {company.phone}
                </span>
              )}
              {company.phone && company.website && <span>•</span>}
              {company.website && (
                <a
                  href={
                    company.website.startsWith("http")
                      ? company.website
                      : `https://${company.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
                >
                  🌐 {company.website}
                </a>
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
              href={`/contacts/new?companyId=${company.id}`}
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
                    <div className="truncate pr-4">
                      <h4 className="font-medium text-slate-200 text-sm group-hover:text-blue-400 transition truncate">
                        {client.name}
                      </h4>
                      {/* 🚨 Added Job Title to Contact List */}
                      <p className="text-xs text-slate-500 truncate">
                        {client.jobTitle ? `${client.jobTitle} • ` : ""}
                        {client.email}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${client.status === "ACTIVE" || client.status === "WON" ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"}`}
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
            <Link
              href={`/pipeline/new?companyId=${company.id}`}
              className="text-xs text-blue-400 hover:text-blue-300 transition"
            >
              + Add Deal
            </Link>
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
                  <Link
                    href={`/pipeline/${deal.id}/edit`}
                    key={deal.id}
                    className="block bg-[#1E2532] border border-slate-700 p-4 rounded-xl hover:border-blue-500/50 transition group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-slate-200 text-sm group-hover:text-blue-400 transition">
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
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
