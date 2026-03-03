import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";
import { updateTask } from "../../../../actions/task_action";
import { User } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../../../lib/rbac_helpers";

// ==========================================
// 1. STRICT TYPES
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string; returnTo?: string }>;
}) {
  const { returnTo } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // 1. Authenticate User & Fetch Team
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");
  const authUser = dbUser as AuthUserWithTeam;

  const resolvedParams = await params;
  const taskId = resolvedParams.id;

  // 2. Fetch the specific task securely
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
      organizationId: authUser.organizationId,
    },
  });

  if (!task) redirect("/tasks");

  // 3. RBAC Verification: Can this user edit this task?
  const isOwner = task.employeeId === authUser.id;
  const isManager = authUser.role === "ADMIN" || authUser.role === "MANAGER";
  const isTeamMember = authUser.teamMembers.some(
    (tm) => tm.id === task.employeeId,
  );

  if (!isOwner && !isManager && !isTeamMember) {
    redirect("/tasks"); // Unauthorized
  }

  // 4. Get dynamic ownership filter for the Contacts Dropdown
  const ownershipFilter = getSecureOwnershipFilter(authUser);
  const contacts = await prisma.contact.findMany({
    where: {
      organizationId: authUser.organizationId,
      ...ownershipFilter,
    },
    orderBy: { name: "asc" },
  });

  // 🚨 5. Determine who this user is allowed to assign tasks to (For Reassignment)
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

  // 6. Bind the Server Action
  const updateAction = updateTask.bind(null, task.id);

  // Format due date for HTML input (YYYY-MM-DD)
  const formattedDueDate = task.dueDate
    ? task.dueDate.toISOString().split("T")[0]
    : "";

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
        <h1 className="text-2xl font-bold text-slate-800">Edit Task</h1>
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6 md:p-8">
        <form action={updateAction} className="space-y-8">
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
                  defaultValue={task.title}
                  required
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 🚨 Re-assignment Dropdown (Only shows for Admins & Managers) */}
              {(authUser.role === "ADMIN" || authUser.role === "MANAGER") && (
                <div>
                  <label
                    htmlFor="employeeId"
                    className="block text-sm font-medium text-slate-300 mb-2"
                  >
                    Assigned To
                  </label>
                  <select
                    id="employeeId"
                    name="employeeId"
                    defaultValue={task.employeeId}
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
                  defaultValue={formattedDueDate}
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
                  defaultValue={task.clientId || ""}
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

            <div className="mb-6">
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
                defaultValue={task.description || ""}
                className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Status Toggle Switch */}
            <div className="flex items-center bg-[#1E2532] border border-slate-600 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isCompleted"
                  defaultChecked={task.isCompleted}
                  className="w-5 h-5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800 bg-slate-700"
                />
                <span className="text-sm font-medium text-slate-300">
                  Mark Task as Completed
                </span>
              </label>
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
