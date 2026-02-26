"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { User } from "@prisma/client";
// 🚨 Import the centralized type
import { AuthUserWithTeam } from "../lib/rbac_helpers";

// ==========================================
// SECURITY HELPERS
// ==========================================

async function getAuthenticatedUser(): Promise<AuthUserWithTeam> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) {
    throw new Error("No organization found");
  }

  return dbUser as AuthUserWithTeam;
}

// 🚨 SECURE RBAC CHECKER FOR TASKS
async function verifyTaskAccess(taskId: string, currentUser: AuthUserWithTeam) {
  const targetTask = await prisma.task.findUnique({
    where: {
      id: taskId,
      organizationId: currentUser.organizationId,
    },
  });

  if (!targetTask) throw new Error("Task not found.");

  // 👑 ADMINS: Full access
  if (currentUser.role === "ADMIN") return targetTask;

  // 👔 MANAGERS: Own + Team
  if (currentUser.role === "MANAGER") {
    const validTeamIds = currentUser.teamMembers.map((m: User) => m.id);
    if (
      targetTask.employeeId !== currentUser.id &&
      !validTeamIds.includes(targetTask.employeeId)
    ) {
      throw new Error(
        "Security Violation: Access denied to team-external record.",
      );
    }
    return targetTask;
  }

  // 💼 EMPLOYEES: Own Only
  if (targetTask.employeeId !== currentUser.id) {
    throw new Error("Security Violation: You can only modify your own tasks.");
  }

  return targetTask;
}

// ==========================================
// TASK ACTIONS
// ==========================================

export async function createTask(formData: FormData) {
  const dbUser = await getAuthenticatedUser();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const dueDate = formData.get("dueDate") as string;
  const clientId = formData.get("clientId") as string;

  await prisma.task.create({
    data: {
      title,
      description: description || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      isCompleted: false,
      employeeId: dbUser.id,
      clientId: clientId || null,
      organizationId: dbUser.organizationId,
    },
  });

  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function toggleTaskCompletion(
  taskId: string,
  isCompleted: boolean,
) {
  const dbUser = await getAuthenticatedUser();
  await verifyTaskAccess(taskId, dbUser);

  await prisma.task.update({
    where: { id: taskId },
    data: { isCompleted },
  });

  revalidatePath("/tasks");
}

export async function deleteTask(taskId: string) {
  const dbUser = await getAuthenticatedUser();
  await verifyTaskAccess(taskId, dbUser);

  await prisma.task.delete({
    where: { id: taskId },
  });

  revalidatePath("/tasks");
}
