import React from "react";
import Link from "next/link";
import { deleteCompany } from "../../actions/company_action";
import { Contact, AccountType } from "@prisma/client";

// 🚨 UPGRADED PROPS: Included the new SFA fields from the schema
type CompanyCardProps = {
  company: {
    id: string;
    name: string;
    type: AccountType; // 🌟 SFA Standard
    industry: string | null;
    employeeCount: string | null;
    website: string | null;
    tickerSymbol: string | null; // 🌟 SFA Standard
    contacts: Contact[];
    deals: { stage: string; amount: number }[];
  };
  canEdit: boolean;
};

// Map the official Prisma AccountType to tailwind color classes
function getTypeColor(type: AccountType) {
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

export default function CompanyCard({ company, canEdit }: CompanyCardProps) {
  // 1. Calculate pipeline metrics
  let activeDealsCount = 0;
  let totalPipeline = 0;
  let totalRevenue = 0;

  company.deals.forEach((deal) => {
    if (deal.stage === "WON") {
      totalRevenue += deal.amount;
    } else if (deal.stage !== "LOST") {
      activeDealsCount += 1;
      totalPipeline += deal.amount;
    }
  });

  const deleteAction = deleteCompany.bind(null, company.id);

  return (
    <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col gap-4 group relative">
      {/* Absolute Header Actions */}
      {canEdit && (
        <form
          action={deleteAction}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button
            type="submit"
            className="text-red-400/70 hover:text-red-400 text-xs font-medium bg-[#1E2532] px-2 py-1 rounded"
          >
            Delete
          </button>
        </form>
      )}

      {/* Primary Identity Section */}
      <div className="flex justify-between items-start pr-12">
        <div className="w-full">
          <div className="flex items-center gap-2">
            <Link
              href={`/companies/${company.id}`}
              className="text-lg font-bold text-white hover:text-blue-400 transition truncate"
            >
              {company.name}
            </Link>
            {/* 🚨 Ticker Symbol Badge */}
            {company.tickerSymbol && (
              <span className="text-[10px] font-mono bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded">
                ${company.tickerSymbol.toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex gap-2 items-center truncate">
            {company.industry && <span>{company.industry}</span>}
            {company.industry && company.employeeCount && <span>•</span>}
            {company.employeeCount && <span>{company.employeeCount} emp.</span>}
          </div>
        </div>
      </div>

      {/* Badges & Links */}
      <div className="flex flex-wrap gap-2">
        {/* 🚨 Uses the real AccountType from the DB now! */}
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${getTypeColor(company.type)}`}
        >
          {company.type}
        </span>

        {company.website && (
          <a
            href={
              company.website.startsWith("http")
                ? company.website
                : `https://${company.website}`
            }
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition"
          >
            Website ↗
          </a>
        )}
      </div>

      {/* SFA Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 border-t border-slate-700/50 pt-4 mt-2">
        <div>
          <p className="text-xs text-slate-400 mb-1">Contacts</p>
          <p className="text-lg font-semibold text-white">
            {company.contacts.length}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Active Pipeline</p>
          <p className="text-lg font-semibold text-blue-400">
            $
            {totalPipeline.toLocaleString(undefined, {
              minimumFractionDigits: 0,
            })}
          </p>
        </div>
      </div>

      {/* Quick Action Links */}
      <div className="flex gap-4 pt-4 mt-auto border-t border-slate-700/50">
        <Link
          href={`/contacts/new?companyId=${company.id}`}
          className="text-xs font-medium text-slate-400 hover:text-blue-400 transition flex items-center gap-1"
        >
          + Contact
        </Link>
        <Link
          href={`/pipeline/new?companyId=${company.id}`}
          className="text-xs font-medium text-slate-400 hover:text-emerald-400 transition flex items-center gap-1"
        >
          + Deal
        </Link>
        <Link
          href={`/companies/${company.id}`}
          className="text-xs font-medium text-slate-400 hover:text-white transition flex items-center gap-1 ml-auto"
        >
          View &rarr;
        </Link>
      </div>

      {/* Historical Revenue Callout */}
      {totalRevenue > 0 && (
        <div className="bg-[#1E2532] -mx-6 -mb-6 p-4 mt-2 rounded-b-2xl border-t border-emerald-500/30 flex justify-between items-center">
          <span className="text-xs text-emerald-500/70 font-medium">
            Closed Revenue
          </span>
          <span className="text-sm font-bold text-emerald-400">
            ${totalRevenue.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
