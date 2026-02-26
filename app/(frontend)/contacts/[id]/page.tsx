import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";

export default async function ContactDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/setup");

  // Fetch the contact and all their related data
  const contact = await prisma.contact.findUnique({
    where: {
      id: id,
      organizationId: dbUser.organizationId, // Security: Ensure they belong to this org
    },
    include: {
      companyRecord: true,
      deals: {
        orderBy: { createdAt: "desc" },
      },
      tasks: {
        where: { isCompleted: false },
        orderBy: { dueDate: "asc" },
      },
      emailDrafts: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!contact) {
    return (
      <div className="p-8 text-center text-slate-400">
        Contact not found or you do not have permission to view them.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/contacts"
          className="p-2 bg-[#242E3D] hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700/50"
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
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            {contact.name}
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                contact.type === "LEAD"
                  ? "bg-orange-500/20 text-orange-400 border-orange-500/20"
                  : "bg-blue-500/20 text-blue-400 border-blue-500/20"
              }`}
            >
              {contact.type}
            </span>
          </h1>
          <p className="text-slate-400 flex items-center gap-2 mt-1">
            📧 {contact.email}
            {contact.companyRecord && (
              <span>• 🏢 {contact.companyRecord.name}</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Context & Tasks */}
        <div className="md:col-span-1 space-y-8">
          {/* AI Context Card */}
          <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50">
            <h3 className="font-bold text-white mb-4">
              AI Relationship Context
            </h3>
            <p className="text-sm text-slate-400 bg-[#1E2532] p-4 rounded-xl border border-slate-700/50 leading-relaxed">
              {contact.relationshipContext ||
                "No context provided. The AI will treat this as a cold relationship."}
            </p>
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <Link
                href={`/contacts/${contact.id}/edit`}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Edit Context &rarr;
              </Link>
            </div>
          </div>

          {/* Tasks Card */}
          <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">Pending Tasks</h3>
              <Link
                href="/tasks/new"
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition"
              >
                + Add
              </Link>
            </div>
            {contact.tasks.length > 0 ? (
              <ul className="space-y-3">
                {contact.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="text-sm text-slate-300 bg-[#1E2532] p-3 rounded-xl border border-slate-700/50"
                  >
                    <div className="font-medium">{task.title}</div>
                    {task.dueDate && (
                      <div className="text-xs text-slate-500 mt-1">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">No pending tasks.</p>
            )}
          </div>
        </div>

        {/* Right Column: Deals & AI Drafts */}
        <div className="md:col-span-2 space-y-8">
          {/* Deals Section */}
          <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">Associated Deals</h3>
              <Link
                href={`/pipeline/new?clientId=${contact.id}${contact.companyId ? `&companyId=${contact.companyId}` : ""}`}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
              >
                + New Deal
              </Link>
            </div>
            {contact.deals.length > 0 ? (
              <div className="space-y-3">
                {contact.deals.map((deal) => (
                  <Link
                    href="/pipeline"
                    key={deal.id}
                    className="flex justify-between items-center bg-[#1E2532] p-4 rounded-xl border border-slate-700/50 hover:border-slate-500/50 transition"
                  >
                    <div>
                      <h4 className="font-medium text-white">{deal.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
                        {deal.stage}
                      </p>
                    </div>
                    <div className="font-bold text-emerald-400">
                      ${deal.amount.toLocaleString()}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">
                No deals found for this contact.
              </p>
            )}
          </div>

          {/* AI Email Drafts Section (Placeholder for Next Step) */}
          <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">AI Email Drafts</h3>
              {/* This is where we will hook up the Vercel AI SDK generate button! */}
              <button className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                ✨ Generate Draft
              </button>
            </div>
            {contact.emailDrafts.length > 0 ? (
              <div className="space-y-3">
                {contact.emailDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="bg-[#1E2532] p-4 rounded-xl border border-slate-700/50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-slate-200">
                        {draft.subject}
                      </h4>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {draft.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {draft.body}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">
                No AI drafts generated yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
