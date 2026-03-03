import React from "react";
import Link from "next/link";
import { Contact, ContactType } from "@prisma/client";
import { deleteContact } from "../../../actions/contact_action";

type ContactCardProps = {
  contact: Contact & {
    companyRecord: { name: string } | null;
  };
  canEdit: boolean;
  returnTo?: string;
};

export default function ContactCard({
  contact,
  canEdit,
  returnTo,
}: ContactCardProps) {
  const deleteAction = deleteContact.bind(null, contact.id);

  return (
    <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col gap-4 group relative hover:border-slate-500/50 transition-colors">
      {canEdit && (
        <form
          action={deleteAction}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <button
            type="submit"
            className="text-red-400/70 hover:text-red-400 text-xs font-medium bg-[#1E2532] px-2 py-1 rounded border border-red-500/20"
          >
            Delete
          </button>
        </form>
      )}

      {/* 🚨 THE FIX: Added pr-16 to push the badge away from the corner! */}
      <div className="flex justify-between items-start pr-16">
        <div>
          <Link
            href={`/contacts/${contact.id}?returnTo=${returnTo || "/contacts"}`}
            className="hover:underline"
          >
            <h3 className="text-lg font-bold hover:text-blue-400 text-white">
              {contact.name}
            </h3>
          </Link>
          <p className="text-sm text-slate-400">{contact.email}</p>
          {contact.companyRecord && (
            <p className="text-xs font-medium text-slate-500 mt-1">
              🏢 {contact.companyRecord.name}
            </p>
          )}
        </div>

        {/* The Smart Badge */}
        {contact.type === "LEAD" ? (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/20">
            Lead
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/20">
            Contact
          </span>
        )}
      </div>

      {contact.relationshipContext && (
        <div className="text-xs text-slate-400 bg-[#1E2532] p-3 rounded-lg border border-slate-700/50 line-clamp-3">
          <span className="font-semibold text-slate-300 block mb-1">
            AI Context Notes:
          </span>
          {contact.relationshipContext}
        </div>
      )}

      {/* Quick Actions Footer */}
      <div className="pt-4 mt-auto border-t border-slate-700/50 flex gap-4 items-center">
        <Link
          href={`/contacts/${contact.id}/edit?returnTo=${returnTo || "/contacts"}`}
          className="text-xs font-medium text-slate-400 hover:text-white transition"
        >
          Edit Details
        </Link>

        {/* Instantly jump to a new deal for this specific person */}
        <Link
          href={`/pipeline/new?clientId=${contact.id}${contact.companyId ? `&companyId=${contact.companyId}` : ""} &returnTo=${returnTo || "/contacts"}`}
          className="text-xs font-medium text-slate-400 hover:text-emerald-400 transition flex items-center gap-1 ml-auto"
        >
          + Add Deal
        </Link>
      </div>
    </div>
  );
}
