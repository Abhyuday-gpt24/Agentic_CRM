import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import { toggleTaskCompletion, deleteTask } from "../../actions/task_action";
import { User } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";

// ==========================================
// 1. STRICT TYPES & RBAC LOGIC
// ==========================================

// Strictly typed user ensuring organizationId is a string
type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

async function getFilteredTasks(dbUser: AuthUserWithTeam) {
  // 🚨 1. Get the dynamic ownership filter from our central utility
  const ownershipFilter = getSecureOwnershipFilter(dbUser);

  // 🚨 2. Execute the securely filtered query
  return await prisma.task.findMany({
    where: {
      organizationId: dbUser.organizationId,
      ...ownershipFilter, // Instantly secures the query
    },
    include: {
      contact: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: [
      { isCompleted: "asc" }, // Incomplete first
      { dueDate: "asc" }, // Earliest due date first
    ],
  });
}

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================
export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // Fetch User & Team (Required for Manager RBAC)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const authUser = dbUser as AuthUserWithTeam;
  const tasks = await getFilteredTasks(authUser);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-slate-600">
            Manage follow-ups and daily activities.
          </p>
        </div>
        <Link
          href="/tasks/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-500/20"
        >
          + Add Task
        </Link>
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic">
            {"You're all caught up! Enjoy your day or add a new task."}
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {tasks.map((task) => {
              const toggleAction = toggleTaskCompletion.bind(
                null,
                task.id,
                !task.isCompleted,
              );
              const deleteAction = deleteTask.bind(null, task.id);

              const isOverdue =
                task.dueDate &&
                new Date(task.dueDate) < new Date() &&
                !task.isCompleted;

              // Security check: Only allow deleting if they own it, or if they are Admin/Manager
              const canDelete =
                authUser.role === "ADMIN" ||
                authUser.role === "MANAGER" ||
                task.employeeId === authUser.id;

              return (
                <div
                  key={task.id}
                  className={`p-4 flex items-start gap-4 hover:bg-[#1E2532] transition group ${
                    task.isCompleted ? "opacity-50" : ""
                  }`}
                >
                  {/* The Interactive Checkbox */}
                  <form action={toggleAction} className="mt-1">
                    <button
                      type="submit"
                      className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                        task.isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-slate-500 hover:border-blue-400 text-transparent hover:text-blue-400"
                      }`}
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </button>
                  </form>

                  <div className="flex-1">
                    <h3
                      className={`text-base font-medium ${
                        task.isCompleted
                          ? "line-through text-slate-500"
                          : "text-white"
                      }`}
                    >
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-slate-400 mt-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-2 text-xs font-medium">
                      {task.dueDate && (
                        <span
                          className={
                            isOverdue ? "text-red-400" : "text-slate-500"
                          }
                        >
                          📅 {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}

                      {task.contact && (
                        <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          👤 {task.contact.name}
                        </span>
                      )}

                      {/* 🚨 FIXED: Cleanly referencing task.assignedTo.name with full TypeScript support */}
                      {task.employeeId !== authUser.id &&
                        task.assignedTo?.name && (
                          <span className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            🧑‍💼 {task.assignedTo.name}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Delete Button (Only visible if they have permissions) */}
                  {canDelete && (
                    <form action={deleteAction}>
                      <button
                        type="submit"
                        className="text-slate-600 hover:text-red-400 transition p-2 opacity-0 group-hover:opacity-100"
                        title="Delete Task"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
