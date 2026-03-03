import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import { createTask } from "../../../actions/task_action";
import { User } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../../lib/rbac_helpers";

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const authUser = dbUser as AuthUserWithTeam;

  const ownershipFilter = getSecureOwnershipFilter(authUser);

  const contacts = await prisma.contact.findMany({
    where: {
      organizationId: authUser.organizationId,
      ...ownershipFilter,
    },
    orderBy: { name: "asc" },
  });

  // 🚨 Determine who this user is allowed to assign tasks to
  let assignableUsers: { id: string; name: string }[] = [];

  if (authUser.role === "ADMIN") {
    const allUsers = await prisma.user.findMany({
      where: { organizationId: authUser.organizationId },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    assignableUsers = allUsers.map((u) => ({
      id: u.id,
      name: u.name || u.email || "Unknown User",
    }));
  } else if (authUser.role === "MANAGER") {
    assignableUsers = [
      { id: authUser.id, name: "Me (Self)" },
      ...authUser.teamMembers.map((u) => ({
        id: u.id,
        name: u.name || u.email || "Unknown User",
      })),
    ];
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={returnTo || "/tasks"}
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
        <h1 className="text-2xl font-bold text-slate-800">Create New Task</h1>
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6 md:p-8">
        <form action={createTask} className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700/50 pb-2">
              Action Items
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div
                className={authUser.role === "EMPLOYEE" ? "md:col-span-2" : ""}
              >
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

              {/* 🚨 Task Assignment Dropdown (Only shows for Admins & Managers) */}
              {(authUser.role === "ADMIN" || authUser.role === "MANAGER") && (
                <div>
                  <label
                    htmlFor="employeeId"
                    className="block text-sm font-medium text-slate-300 mb-2"
                  >
                    Assign Task To
                  </label>
                  <select
                    id="employeeId"
                    name="employeeId"
                    defaultValue={authUser.id}
                    className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                  className="w-full bg-[#1E2532] border border-slate-600 text-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [color-scheme:dark]"
                />
              </div>

              <div>
                <label
                  htmlFor="clientId"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Related Record (Lead/Contact)
                </label>
                <select
                  id="clientId"
                  name="clientId"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">General Task / No specific record</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}{" "}
                      {contact.type === "LEAD" ? "(Lead)" : "(Contact)"}
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
                rows={4}
                placeholder="Any specific details, links, or instructions for this task?"
                className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-700/50">
            <Link
              href={returnTo || "/tasks"}
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
