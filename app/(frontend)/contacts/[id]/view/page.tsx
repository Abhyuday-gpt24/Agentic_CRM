import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";
import { deleteContact } from "../../../../actions/contact_action";
import { generateAiDraft, approveDraft } from "../../../../actions/ai_actions";

function getStatusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "ACTIVE" || s === "WON") return "bg-green-500/20 text-green-400";
  if (s === "NEGOTIATION" || s === "PROPOSAL")
    return "bg-orange-500/20 text-orange-400";
  if (s === "LOST") return "bg-red-500/20 text-red-400";
  return "bg-blue-500/20 text-blue-400";
}

export default async function ContactViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const contact = await prisma.client.findUnique({
    where: { id: id, organizationId: dbUser.organizationId },
    include: {
      emailDrafts: {
        where: { status: "PENDING_APPROVAL" },
        orderBy: { createdAt: "desc" },
      },
      interactions: {
        orderBy: { date: "desc" },
        take: 5,
      },
    },
  });

  if (!contact) {
    return (
      <div className="p-8 text-center text-slate-400">Contact not found.</div>
    );
  }

  // Bind Server Actions
  const deleteContactAction = deleteContact.bind(null, contact.id);
  const generateDraftAction = generateAiDraft.bind(null, contact.id);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* HEADER: Navigation and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
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
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {contact.name}
            </h1>
            <p className="text-sm text-slate-500">
              {contact.company || "No Company"} • {contact.email}
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          {/* Delete Form */}
          <form action={deleteContactAction}>
            <button
              type="submit"
              className="text-red-400 hover:text-red-500 font-medium text-sm px-2"
            >
              Delete
            </button>
          </form>
          <Link
            href={`/contacts/${contact.id}/edit`}
            className="bg-[#242E3D] text-slate-200 border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-lg font-medium transition"
          >
            Edit Lead
          </Link>
          {/* Generate Draft Form */}
          <form action={generateDraftAction}>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 active:scale-95"
            >
              <span>✨</span> Draft AI Email
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Details & Context */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Lead Status
            </h3>
            <span
              className={`px-3 py-1.5 rounded-md text-sm font-bold ${getStatusBadge(contact.status)}`}
            >
              {contact.status}
            </span>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Last Contacted</span>
                <span className="text-slate-200">
                  {contact.lastContactedAt
                    ? new Date(contact.lastContactedAt).toLocaleDateString()
                    : "Never"}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Next Follow-up</span>
                <span className="text-blue-400 font-medium">
                  {contact.nextFollowUpDate
                    ? new Date(contact.nextFollowUpDate).toLocaleDateString()
                    : "Not Scheduled"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2532] rounded-2xl shadow-lg border border-blue-500/30 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">
              🧠
            </div>
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>✨</span> AI Context Memory
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {contact.relationshipContext ||
                "No context provided. Edit this lead to add notes for the AI."}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Activity & AI Drafts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending AI Drafts */}
          <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              Pending AI Drafts
              {contact.emailDrafts.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {contact.emailDrafts.length}
                </span>
              )}
            </h3>

            {contact.emailDrafts.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm border-2 border-dashed border-slate-700 rounded-xl">
                {
                  "No pending emails to review. Click 'Draft AI Email' to generate one."
                }
              </div>
            ) : (
              <div className="space-y-4">
                {contact.emailDrafts.map((draft) => {
                  const approveAction = approveDraft.bind(
                    null,
                    draft.id,
                    contact.id,
                  );

                  return (
                    <div
                      key={draft.id}
                      className="bg-[#1E2532] border border-slate-700 p-4 rounded-xl"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-slate-200 text-sm">
                          Subject: {draft.subject}
                        </h4>
                        <span className="text-xs text-orange-400 font-semibold bg-orange-400/10 px-2 py-1 rounded">
                          Needs Approval
                        </span>
                      </div>

                      {/* Show the actual AI generated body */}
                      <div className="bg-[#242E3D] p-3 rounded-lg mb-3 mt-2 text-sm text-slate-300 whitespace-pre-wrap border border-slate-700/50">
                        {draft.body}
                      </div>

                      <p className="text-xs text-slate-500 mb-3 italic">
                        🤖 Reason: {draft.aiReasoning}
                      </p>

                      <div className="flex gap-2">
                        {/* Approve Form */}
                        <form action={approveAction}>
                          <button
                            type="submit"
                            className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95"
                          >
                            Approve & Log Interaction
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interaction History */}
          <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6">
            <h3 className="text-base font-bold text-white mb-4">
              Recent Interactions
            </h3>
            {contact.interactions.length === 0 ? (
              <div className="text-slate-500 text-sm italic">
                No interactions logged yet.
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                {contact.interactions.map((interaction) => (
                  <div
                    key={interaction.id}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-slate-700 bg-[#1E2532] text-slate-400 group-[.is-active]:text-emerald-400 group-[.is-active]:border-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-[10px]">
                      {interaction.type === "EMAIL_SENT"
                        ? "✉️"
                        : interaction.type === "CALL"
                          ? "📞"
                          : "🤝"}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#1E2532] p-4 rounded-xl border border-slate-700 shadow">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-slate-300 text-xs">
                          {interaction.type.replace("_", " ")}
                        </div>
                        <time className="text-[10px] text-slate-500">
                          {new Date(interaction.date).toLocaleDateString()}
                        </time>
                      </div>
                      <div className="text-slate-400 text-xs">
                        {interaction.summary}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
