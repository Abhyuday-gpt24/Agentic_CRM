import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import { convertLeadToContact } from "../../actions/contact_action";
import { User } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";

// ==========================================
// 1. STRICT TYPES & RBAC LOGIC
// ==========================================

// 🚨 Define the strict type for the authenticated user + their nested team
type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

async function getFilteredLeads(dbUser: AuthUserWithTeam) {
  // 🚨 1. Get the dynamic ownership filter from our central utility
  const ownershipFilter = getSecureOwnershipFilter(dbUser);

  // 🚨 2. Execute the securely filtered query combining base logic and ownership
  return await prisma.contact.findMany({
    where: {
      organizationId: dbUser.organizationId,
      type: "LEAD", // Strict enum filter
      ...ownershipFilter, // Instantly secures the query
    },
    orderBy: { createdAt: "desc" },
  });
}

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================
export default async function LeadsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // Fetch User & Team (Required for Manager RBAC)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  // 🚨 Cast the returned database record to our strict type
  const authUser = dbUser as AuthUserWithTeam;

  // Fetch the dynamically filtered leads
  const leads = await getFilteredLeads(authUser);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Raw Leads</h1>
          <p className="text-sm text-slate-600">
            Unqualified prospects that need outreach.
          </p>
        </div>
        <Link
          href="/contacts/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-500/20"
        >
          + Add Lead
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-12 text-center text-slate-400 italic">
          Inbox zero! You have no raw leads right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map((lead) => {
            // Bind the server action so we can convert this specific lead
            const convertAction = convertLeadToContact.bind(
              null,
              lead.id,
              undefined,
            );

            return (
              <div
                key={lead.id}
                className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col gap-4 group hover:border-slate-600 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                      {lead.name}
                    </h3>
                    <p className="text-sm text-slate-400">{lead.email}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    Cold Lead
                  </span>
                </div>

                {lead.relationshipContext && (
                  <div className="text-xs text-slate-400 bg-[#1E2532] p-3 rounded-lg border border-slate-700/50 line-clamp-2">
                    {lead.relationshipContext}
                  </div>
                )}

                <div className="pt-4 mt-auto border-t border-slate-700/50 flex justify-between items-center">
                  <Link
                    href={`/contacts/${lead.id}/edit`}
                    className="text-xs font-medium text-slate-400 hover:text-blue-400 transition"
                  >
                    Edit Details
                  </Link>

                  {/* The Convert Button */}
                  <form action={convertAction}>
                    <button
                      type="submit"
                      className="text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg transition active:scale-95"
                    >
                      Convert to Contact &rarr;
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
