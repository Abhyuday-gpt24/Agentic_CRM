import React from "react";
import Link from "next/link";
import {
  convertLeadToContact,
  deleteContact,
} from "../../../actions/contact_action"; // 🚨 Imported deleteContact
import { LeadStatus, Contact } from "@prisma/client";

// Define the exact type we get back from our Prisma query, including the joined company
type LeadWithCompany = Contact & {
  companyRecord: { name: string } | null;
};

// Helper function to colorize the Lead Status badge
function getStatusColor(status: LeadStatus | null) {
  switch (status) {
    case "NEW":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "ATTEMPTED_CONTACT":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "ENGAGED":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "QUALIFIED":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "UNQUALIFIED":
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

export default function LeadCard({
  lead,
  canEdit = true, // 🚨 Added canEdit prop for RBAC UI support
}: {
  lead: LeadWithCompany;
  canEdit?: boolean;
}) {
  // Bind the server actions directly inside the card
  const convertAction = convertLeadToContact.bind(null, lead.id, undefined);
  const deleteAction = deleteContact.bind(null, lead.id); // 🚨 Bound the delete action

  // Figure out the best company name to display
  const companyDisplay =
    lead.companyRecord?.name || lead.tempCompanyName || "Independent";

  return (
    <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col gap-4 group hover:border-slate-600 transition-colors">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 truncate">
          <h3 className="text-lg font-bold text-white ">{lead.name}</h3>
          <p className="text-sm font-medium text-slate-300 truncate mt-0.5">
            {lead.jobTitle ? `${lead.jobTitle} at ` : ""}
            {companyDisplay}
          </p>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border whitespace-nowrap ${getStatusColor(lead.leadStatus)}`}
        >
          {lead.leadStatus ? lead.leadStatus.replace("_", " ") : "COLD LEAD"}
        </span>
      </div>

      <div className="text-sm text-slate-400 space-y-1">
        <div className="flex items-center gap-2 truncate">
          <span>✉️</span> {lead.email}
        </div>
        {lead.phone && (
          <div className="flex items-center gap-2 truncate">
            <span>📞</span> {lead.phone}
          </div>
        )}
      </div>

      {lead.relationshipContext && (
        <div className="text-xs text-slate-400 bg-[#1E2532] p-3 rounded-lg border border-slate-700/50 line-clamp-2">
          {lead.relationshipContext}
        </div>
      )}

      <div className="pt-4 mt-auto border-t border-slate-700/50 flex justify-between items-center">
        {/* 🚨 Grouped Edit and Delete together on the left */}
        <div className="flex items-center gap-4">
          <Link
            href={`/contacts/${lead.id}/edit?returnTo=/leads`}
            className="text-xs font-medium text-slate-400 hover:text-blue-400 transition"
          >
            Edit
          </Link>

          {canEdit && (
            <form action={deleteAction}>
              <button
                type="submit"
                className="text-xs font-medium text-slate-400 hover:text-red-400 transition"
              >
                Delete
              </button>
            </form>
          )}
        </div>

        <form action={convertAction}>
          <button
            type="submit"
            className="text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg transition active:scale-95"
          >
            Qualify &rarr;
          </button>
        </form>
      </div>
    </div>
  );
}
