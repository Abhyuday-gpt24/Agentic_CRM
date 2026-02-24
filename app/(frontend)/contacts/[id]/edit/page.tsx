import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";
import { updateContact } from "../../../../actions/contact_action";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 1. Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  // 2. Fetch the specific contact
  const contact = await prisma.client.findUnique({
    where: {
      id: id,
      organizationId: dbUser.organizationId,
    },
  });

  if (!contact) {
    return (
      <div className="p-8 text-center text-slate-400">
        {"Contact not found or you don't have permission to view it."}
      </div>
    );
  }

  // 3. Fetch companies for the organization (so the select has data)
  const companies = await prisma.company.findMany({
    where: { organizationId: dbUser.organizationId },
    orderBy: { name: "asc" },
  });

  // 4. Bind the ID to the Server Action
  // This securely passes the contact ID to your server without needing a hidden input field
  const updateContactWithId = updateContact.bind(null, contact.id);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/contacts"
          className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
          title="Go Back"
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
        <h1 className="text-2xl font-bold text-slate-800">
          Edit Lead: {contact.name}
        </h1>
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6 md:p-8">
        {/* The form action uses the bound function */}
        <form action={updateContactWithId} className="space-y-6">
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
                defaultValue={contact.name} // Pre-fill existing data
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
                defaultValue={contact.email}
                className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="companyId"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Associated Company
              </label>
              <select
                id="companyId"
                name="companyId"
                defaultValue={contact.companyId || ""} // Pre-selects the existing company!
                className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">No Company / Independent</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Added a Status dropdown so users can move deals through the pipeline! */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Deal Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={contact.status}
                className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="ACTIVE">Active (Discovery)</option>
                <option value="PROPOSAL">Proposal Sent</option>
                <option value="NEGOTIATION">In Negotiation</option>
                <option value="WON">Closed Won</option>
                <option value="LOST">Closed Lost</option>
              </select>
            </div>
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
              rows={4}
              defaultValue={contact.relationshipContext || ""}
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
            <button
              type="submit"
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition shadow-lg active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
