import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import { deleteCompany } from "../../actions/company_action";

export default async function CompaniesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const canEdit = dbUser.role === "ADMIN" || dbUser.role === "MANAGER";

  // Fetch REAL companies and include their related contacts and deals!
  const companies = await prisma.company.findMany({
    where: { organizationId: dbUser.organizationId },
    include: {
      clients: true,
      deals: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Companies & Accounts
          </h1>
          <p className="text-sm text-slate-500">
            Manage your target organizations and firmographics.
          </p>
        </div>
        <Link
          href="/companies/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          + New Company
        </Link>
      </div>

      {companies.length === 0 ? (
        <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-12 text-center text-slate-400">
          {
            'No accounts found. Click "+ New Company" to add your first target organization!'
          }
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => {
            // Calculate real stats from the relations
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

            const health =
              totalRevenue > 0
                ? "Customer"
                : totalPipeline > 0
                  ? "Active Prospect"
                  : "Cold";
            const healthColors = {
              Customer: "bg-emerald-500/20 text-emerald-400",
              "Active Prospect": "bg-blue-500/20 text-blue-400",
              Cold: "bg-slate-500/20 text-slate-400",
            };

            const deleteAction = deleteCompany.bind(null, company.id);

            return (
              <div
                key={company.id}
                className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col gap-4 group relative"
              >
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

                <div className="flex justify-between items-start pr-12">
                  <div>
                    <Link
                      href={`/companies/${company.id}`}
                      className="text-lg font-bold text-white hover:text-blue-400 transition"
                    >
                      {company.name}
                    </Link>
                    <div className="text-xs text-slate-400 mt-1 flex gap-2 items-center">
                      {company.industry && <span>{company.industry}</span>}
                      {company.industry && company.employeeCount && (
                        <span>•</span>
                      )}
                      {company.employeeCount && (
                        <span>{company.employeeCount} emp.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${healthColors[health]}`}
                  >
                    {health}
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

                <div className="grid grid-cols-2 gap-4 border-t border-slate-700/50 pt-4 mt-2">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Contacts</p>
                    <p className="text-lg font-semibold text-white">
                      {company.clients.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Pipeline</p>
                    <p className="text-lg font-semibold text-blue-400">
                      $
                      {totalPipeline.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>

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
          })}
        </div>
      )}
    </div>
  );
}
