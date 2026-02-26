import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import { createContact } from "../../../actions/contact_action";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  // 🚨 Restored the searchParams so your Company Card "+ Contact" button auto-fills this!
  const { companyId } = await searchParams;

  // 1. Authenticate to get the user's Organization ID
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  // 2. Fetch all companies for the dropdown
  const companies = await prisma.company.findMany({
    where: { organizationId: dbUser.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/contacts"
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
        {/* 🚨 Updated terminology here */}
        <h1 className="text-2xl font-bold text-slate-800">Add New Contact</h1>
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6 md:p-8">
        <p className="text-slate-400 text-sm mb-6 pb-4 border-b border-slate-700/50">
          {
            "Enter the contact's details below. Link them to an existing Account to track firmographics."
          }
        </p>

        <form action={createContact} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="e.g. Bruce Wayne"
                className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="bruce@wayne-enterprises.com"
                className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="companyId"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Associated Company (Account)
            </label>
            <select
              id="companyId"
              name="companyId"
              defaultValue={companyId || ""} // 🚨 Auto-fill magic restored!
              className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No Company / Independent</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}{" "}
                  {company.industry ? `(${company.industry})` : ""}
                </option>
              ))}
            </select>
            {companies.length === 0 && (
              <p className="text-xs text-orange-400 mt-2">
                No companies found. You can add one later from the Companies
                tab.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="context"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Relationship Context (AI Notes)
            </label>
            <textarea
              id="context"
              name="context"
              rows={3}
              placeholder="Where did you meet? What are their pain points?"
              className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-700/50">
            <Link
              href="/contacts"
              className="px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              Cancel
            </Link>
            {/* 🚨 Updated terminology here */}
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg active:scale-95"
            >
              Save Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
