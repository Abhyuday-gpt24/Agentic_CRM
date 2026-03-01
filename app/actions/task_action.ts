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
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId)
    throw new Error("No organization found");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const clientId = formData.get("clientId") as string;
  const dueDateString = formData.get("dueDate") as string;

  const dueDate = dueDateString ? new Date(dueDateString) : null;

  // 🚨 TASK DELEGATION LOGIC
  let targetEmployeeId = dbUser.id; // Default to the creator
  const requestedOwnerId = formData.get("employeeId") as string;

  if (requestedOwnerId && requestedOwnerId !== dbUser.id) {
    if (dbUser.role === "ADMIN") {
      targetEmployeeId = requestedOwnerId; // Admins can assign to anyone
    } else if (dbUser.role === "MANAGER") {
      // Managers can only assign to themselves OR their specific team members
      const isValidTeamMember = dbUser.teamMembers.some(
        (tm) => tm.id === requestedOwnerId,
      );
      if (isValidTeamMember) {
        targetEmployeeId = requestedOwnerId;
      } else {
        throw new Error(
          "Security Violation: Managers can only assign tasks to their own team.",
        );
      }
    }
    // If an EMPLOYEE tries to submit a different ID, it falls back to their own ID.
  }

  await prisma.task.create({
    data: {
      title,
      description: description || null,
      dueDate,
      clientId: clientId || null,
      employeeId: targetEmployeeId, // 🚨 Set the delegated owner
      organizationId: dbUser.organizationId,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
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

export async function updateTask(taskId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId)
    throw new Error("No organization found");

  // 1. Verify the task exists and belongs to the org
  const task = await prisma.task.findUnique({
    where: { id: taskId, organizationId: dbUser.organizationId },
  });

  if (!task) throw new Error("Task not found");

  // 2. RBAC Verification
  const isOwner = task.employeeId === dbUser.id;
  const isManager = dbUser.role === "ADMIN" || dbUser.role === "MANAGER";
  const isTeamMember = dbUser.teamMembers.some(
    (tm) => tm.id === task.employeeId,
  );

  if (!isOwner && !isManager && !isTeamMember) {
    throw new Error(
      "Security Violation: You do not have permission to edit this task.",
    );
  }

  // 3. Extract Form Data
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const clientId = formData.get("clientId") as string;
  const dueDateString = formData.get("dueDate") as string;
  const isCompleted = formData.get("isCompleted") === "on";

  const dueDate = dueDateString ? new Date(dueDateString) : null;

  // 4. Execute Update
  await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description: description || null,
      dueDate,
      clientId: clientId || null,
      isCompleted,
    },
  });

  revalidatePath("/tasks");
  redirect("/tasks");
}
