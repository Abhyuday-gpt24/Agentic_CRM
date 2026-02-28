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

  // 🚨 Ownership filter for records owned by specific employees
  const ownershipFilter = getSecureOwnershipFilter(authUser);

  // 🚀 Parallel search across ALL models
  const [deals, contacts, companies, tasks, products] = await Promise.all([
    // 1. DEALS (Needs Ownership Filter)
    prisma.deal.findMany({
      where: {
        organizationId: authUser.organizationId,
        name: { contains: query, mode: "insensitive" },
        ...ownershipFilter,
      },
      include: { company: { select: { name: true } } },
      take: 10,
    }),

    // 2. CONTACTS & LEADS (Needs Ownership Filter)
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

    // 3. COMPANIES (Global Org Asset - No Ownership Filter)
    prisma.company.findMany({
      where: {
        organizationId: authUser.organizationId,
        name: { contains: query, mode: "insensitive" },
      },
      take: 10,
    }),

    // 4. TASKS (Needs Ownership Filter)
    prisma.task.findMany({
      where: {
        organizationId: authUser.organizationId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
        ...ownershipFilter,
      },
      take: 10,
    }),

    // 5. PRODUCTS (Global Org Asset - No Ownership Filter)
    prisma.product.findMany({
      where: {
        organizationId: authUser.organizationId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
    }),
  ]);

  const totalResults =
    deals.length +
    contacts.length +
    companies.length +
    tasks.length +
    products.length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-8 border-b border-slate-700 pb-6">
        <h1 className="text-2xl font-bold text-white">Search Results</h1>
        <p className="text-slate-400 mt-1">
          Found {totalResults} matches for{" "}
          <span className="text-blue-400 font-semibold">{query}</span>
        </p>
      </div>

      {totalResults === 0 ? (
        <div className="text-center py-20 bg-[#242E3D] rounded-2xl border border-dashed border-slate-700 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-2xl text-slate-500">
            🔍
          </div>
          <p className="text-slate-400 font-medium">
            No records found matching your search.
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Try checking for typos or using different keywords.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* ================= COMPANIES SECTION ================= */}
          {companies.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                🏢 Companies{" "}
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-xs">
                  {companies.length}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {companies.map((company) => (
                  <Link
                    key={company.id}
                    href={`/companies/${company.id}`}
                    className="bg-[#242E3D] p-4 rounded-xl border border-slate-700 hover:border-blue-500 transition-all group"
                  >
                    <p className="font-bold text-white group-hover:text-blue-400 transition-colors">
                      {company.name}
                    </p>
                    {company.industry && (
                      <p className="text-xs text-slate-500 mt-1">
                        {company.industry}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ================= DEALS SECTION ================= */}
          {deals.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                💰 Pipeline Deals{" "}
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-xs">
                  {deals.length}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {deals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/pipeline`}
                    className="bg-[#242E3D] p-4 rounded-xl border border-slate-700 hover:border-blue-500 transition-all flex justify-between items-center group"
                  >
                    <div>
                      <p className="font-bold text-white group-hover:text-blue-400 transition-colors">
                        {deal.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {deal.company?.name || "No Company"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">
                        ${deal.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">
                        {deal.stage}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ================= CONTACTS & LEADS SECTION ================= */}
          {contacts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                👥 People & Leads{" "}
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-xs">
                  {contacts.length}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {contacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href={contact.type === "LEAD" ? "/leads" : "/contacts"}
                    className="bg-[#242E3D] p-4 rounded-xl border border-slate-700 hover:border-blue-500 transition-all flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white uppercase border border-slate-600">
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white group-hover:text-blue-400 transition-colors">
                          {contact.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {contact.email}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide ${contact.type === "LEAD" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}
                    >
                      {contact.type}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ================= TASKS SECTION ================= */}
          {tasks.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                ✅ Tasks{" "}
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-xs">
                  {tasks.length}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks`}
                    className="bg-[#242E3D] p-4 rounded-xl border border-slate-700 hover:border-blue-500 transition-all flex items-start gap-3 group"
                  >
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border ${task.isCompleted ? "bg-emerald-500 border-emerald-500" : "border-slate-500"}`}
                    />
                    <div>
                      <p
                        className={`font-bold transition-colors ${task.isCompleted ? "text-slate-400 line-through" : "text-white group-hover:text-blue-400"}`}
                      >
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <p className="text-xs text-slate-500 mt-1">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ================= PRODUCTS SECTION ================= */}
          {products.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                📦 Products{" "}
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-xs">
                  {products.length}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products`}
                    className="bg-[#242E3D] p-4 rounded-xl border border-slate-700 hover:border-blue-500 transition-all flex justify-between items-center group"
                  >
                    <div>
                      <p className="font-bold text-white group-hover:text-blue-400 transition-colors">
                        {product.name}
                      </p>
                      {product.sku && (
                        <p className="text-xs text-slate-500 mt-1">
                          SKU: {product.sku}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">
                        ${product.price.toLocaleString()}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold mt-1 inline-block ${product.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
