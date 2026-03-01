import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import { toggleTaskCompletion, deleteTask } from "../../actions/task_action";
import { User, Prisma } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../lib/rbac_helpers";
import DataFilters, { FilterConfig } from "../components/data_filters";
import Pagination from "../components/pagination";

// ==========================================
// 1. STRICT TYPES & CONSTANTS
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

const TASKS_PER_PAGE = 24;

// ==========================================
// 2. THE SECURE QUERY ENGINE
// ==========================================
async function getPaginatedTasks(
  dbUser: AuthUserWithTeam,
  currentPage: number,
  searchParams: {
    q?: string;
    status?: string;
    dateRange?: string;
    ownerId?: string;
    sort?: string;
  },
) {
  const skipAmount = (currentPage - 1) * TASKS_PER_PAGE;

  const whereClause: Prisma.TaskWhereInput = {
    organizationId: dbUser.organizationId,
  };

  if (searchParams.q) {
    whereClause.OR = [
      { title: { contains: searchParams.q, mode: "insensitive" } },
      { description: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  if (searchParams.status && searchParams.status !== "ALL") {
    whereClause.isCompleted = searchParams.status === "COMPLETED";
  }

  if (searchParams.dateRange && searchParams.dateRange !== "ALL") {
    const now = new Date();
    const startDate = new Date();

    if (searchParams.dateRange === "LAST_7_DAYS")
      startDate.setDate(now.getDate() - 7);
    if (searchParams.dateRange === "LAST_30_DAYS")
      startDate.setDate(now.getDate() - 30);
    if (searchParams.dateRange === "THIS_MONTH") startDate.setDate(1);

    whereClause.createdAt = { gte: startDate };
  }

  if (searchParams.ownerId && searchParams.ownerId !== "ALL") {
    const requestedIds = searchParams.ownerId.split(",");
    const authorizedIds: string[] = [];

    for (const id of requestedIds) {
      const isRequestingSelf = id === dbUser.id;
      const isRequestingTeamMember = dbUser.teamMembers.some(
        (tm) => tm.id === id,
      );

      if (
        dbUser.role === "ADMIN" ||
        isRequestingSelf ||
        isRequestingTeamMember
      ) {
        authorizedIds.push(id);
      }
    }

    if (authorizedIds.length > 0) {
      whereClause.employeeId = { in: authorizedIds };
    } else {
      Object.assign(whereClause, getSecureOwnershipFilter(dbUser));
    }
  } else {
    Object.assign(whereClause, getSecureOwnershipFilter(dbUser));
  }

  let orderByClause:
    | Prisma.TaskOrderByWithRelationInput
    | Prisma.TaskOrderByWithRelationInput[] = [
    { isCompleted: "asc" },
    { dueDate: "asc" },
  ];

  if (searchParams.sort) {
    switch (searchParams.sort) {
      case "due_asc":
        orderByClause = { dueDate: "asc" };
        break;
      case "due_desc":
        orderByClause = { dueDate: "desc" };
        break;
      case "newest":
        orderByClause = { createdAt: "desc" };
        break;
      case "oldest":
        orderByClause = { createdAt: "asc" };
        break;
    }
  }

  const [tasks, totalTasks] = await Promise.all([
    prisma.task.findMany({
      where: whereClause,
      include: {
        contact: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: orderByClause,
      take: TASKS_PER_PAGE,
      skip: skipAmount,
    }),
    prisma.task.count({ where: whereClause }),
  ]);

  const totalPages = Math.ceil(totalTasks / TASKS_PER_PAGE);

  return { tasks, totalTasks, totalPages };
}

// ==========================================
// 3. MAIN PAGE COMPONENT
// ==========================================
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    dateRange?: string;
    ownerId?: string;
    sort?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const authUser = dbUser as AuthUserWithTeam;
  const resolvedParams = await searchParams;
  const currentPage = parseInt(resolvedParams.page || "1", 10);

  const pageFilters: FilterConfig[] = [
    {
      key: "status",
      label: "Task Status",
      options: [
        { label: "Pending", value: "PENDING" },
        { label: "Completed", value: "COMPLETED" },
      ],
    },
  ];

  let ownerOptions: { label: string; value: string }[] | undefined = undefined;

  if (authUser.role === "ADMIN" || authUser.role === "MANAGER") {
    ownerOptions = [{ label: "Me Only", value: authUser.id }];

    if (authUser.role === "ADMIN") {
      const allUsers = await prisma.user.findMany({
        where: { organizationId: authUser.organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      ownerOptions = allUsers.map((u) => ({
        label: u.name || "Unknown",
        value: u.id,
      }));
    } else if (authUser.role === "MANAGER") {
      ownerOptions = [
        ...ownerOptions,
        ...authUser.teamMembers.map((u) => ({
          label: u.name || "Unknown",
          value: u.id,
        })),
      ];
    }
  }

  const taskSortOptions = [
    { label: "Earliest Due", value: "due_asc" },
    { label: "Latest Due", value: "due_desc" },
    { label: "Newest Created", value: "newest" },
    { label: "Oldest Created", value: "oldest" },
  ];

  const { tasks, totalTasks, totalPages } = await getPaginatedTasks(
    authUser,
    currentPage,
    resolvedParams,
  );

  const buildPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    Object.entries(resolvedParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", pageNumber.toString());
    return `/tasks?${params.toString()}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-slate-600 mt-1">
            Showing{" "}
            {tasks.length > 0 ? (currentPage - 1) * TASKS_PER_PAGE + 1 : 0} to{" "}
            {Math.min(currentPage * TASKS_PER_PAGE, totalTasks)} of {totalTasks}{" "}
            tasks.
          </p>
        </div>
        <Link
          href="/tasks/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-500/20"
        >
          + Add Task
        </Link>
      </div>

      <DataFilters
        searchPlaceholder="Search tasks by title or description..."
        filters={pageFilters}
        ownerOptions={ownerOptions}
        sortOptions={taskSortOptions}
      />

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic">
            {Object.keys(resolvedParams).length > 0
              ? "No tasks match your current filters. Try clearing them!"
              : "You're all caught up! Enjoy your day or add a new task."}
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

              const canModify =
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
                      className={`text-base font-medium ${task.isCompleted ? "line-through text-slate-500" : "text-white"}`}
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

                      {task.employeeId !== authUser.id &&
                        task.assignedTo?.name && (
                          <span className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            🧑‍💼 {task.assignedTo.name}
                          </span>
                        )}
                    </div>
                  </div>

                  {canModify && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/tasks/${task.id}/edit`}
                        className="text-slate-600 hover:text-blue-400 transition p-2"
                        title="Edit Task"
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
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </Link>

                      <form action={deleteAction}>
                        <button
                          type="submit"
                          className="text-slate-600 hover:text-red-400 transition p-2"
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        buildPageUrl={buildPageUrl}
      />
    </div>
  );
}
