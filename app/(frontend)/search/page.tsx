import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import {
  getSecureOwnershipFilter,
  AuthUserWithTeam,
} from "../../lib/rbac_helpers";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: query } = await searchParams;
  if (!query) redirect("/dashboard");

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");
  const authUser = dbUser as AuthUserWithTeam;
  const ownershipFilter = getSecureOwnershipFilter(authUser);

  // Parallel search across different models
  const [deals, contacts] = await Promise.all([
    prisma.deal.findMany({
      where: {
        organizationId: authUser.organizationId,
        name: { contains: query, mode: "insensitive" },
        ...ownershipFilter,
      },
      include: { company: { select: { name: true } } },
      take: 10,
    }),
    prisma.contact.findMany({
      where: {
        organizationId: authUser.organizationId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
        ...ownershipFilter,
      },
      take: 10,
    }),
  ]);

  const totalResults = deals.length + contacts.length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Search Results</h1>
        <p className="text-slate-400">
          {"Found " + totalResults + "matches for "} {query}
        </p>
      </div>

      <div className="space-y-8">
        {/* DEALS SECTION */}
        {deals.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Deals
            </h2>
            <div className="grid gap-3">
              {deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/pipeline`} // Or a specific deal view if you have one
                  className="bg-[#242E3D] p-4 rounded-xl border border-slate-700 hover:border-blue-500 transition-all flex justify-between items-center group"
                >
                  <div>
                    <p className="font-bold text-white group-hover:text-blue-400 transition-colors">
                      {deal.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {deal.company?.name || "No Company"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">
                      ${deal.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase">
                      {deal.stage}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CONTACTS / LEADS SECTION */}
        {contacts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              People & Leads
            </h2>
            <div className="grid gap-3">
              {contacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={contact.type === "LEAD" ? "/leads" : "/contacts"}
                  className="bg-[#242E3D] p-4 rounded-xl border border-slate-700 hover:border-blue-500 transition-all flex justify-between items-center group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-white group-hover:text-blue-400 transition-colors">
                        {contact.name}
                      </p>
                      <p className="text-xs text-slate-500">{contact.email}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full font-bold ${contact.type === "LEAD" ? "bg-orange-500/10 text-orange-400" : "bg-blue-500/10 text-blue-400"}`}
                  >
                    {contact.type}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {totalResults === 0 && (
          <div className="text-center py-20 bg-[#242E3D] rounded-2xl border border-dashed border-slate-700">
            <p className="text-slate-500 italic">
              No records found matching your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
