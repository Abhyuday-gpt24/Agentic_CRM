import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import { createTask } from "../../../actions/task_action";
import { User } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../../lib/rbac_helpers";

// ==========================================
// 1. STRICT TYPES
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================
export default async function NewTaskPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // 🚨 Fetch User & Team (Required for Manager RBAC)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const authUser = dbUser as AuthUserWithTeam;

  // 🚨 1. Get the dynamic ownership filter
  const ownershipFilter = getSecureOwnershipFilter(authUser);

  // 🚨 2. Fetch contacts securely so reps only see their allowed contacts in the dropdown
  const contacts = await prisma.contact.findMany({
    where: {
      organizationId: authUser.organizationId,
      ...ownershipFilter,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/tasks"
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
        <h1 className="text-2xl font-bold text-slate-800">New Task</h1>
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6 md:p-8">
        <form action={createTask} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Task Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              placeholder="e.g. Follow up on Q3 Proposal"
              className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="dueDate"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Due Date
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [color-scheme:dark]"
              />
            </div>

            <div>
              <label
                htmlFor="clientId"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Related Contact
              </label>
              <select
                id="clientId"
                name="clientId"
                className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">General Task / None</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Notes / Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Any specific details for this task?"
              className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-700/50">
            <Link
              href="/tasks"
              className="px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg active:scale-95"
            >
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
