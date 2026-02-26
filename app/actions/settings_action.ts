"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

// Action 1: Update Profile
export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const newName = formData.get("name") as string;
  const userEmail = session.user.email;

  if (!newName) return;

  await prisma.user.update({
    where: { email: userEmail },
    data: { name: newName },
  });

  revalidatePath("/settings");
}

// Action 2: Securely Invite Team Members
export async function inviteTeamMember(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  // Fetch the user trying to send the invite
  const inviter = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!inviter || !inviter.organizationId) {
    throw new Error("Unauthorized to perform this action.");
  }

  // 🚨 1. EMPLOYEES CANNOT INVITE
  if (inviter.role === "EMPLOYEE") {
    throw new Error("Employees do not have permission to invite new members.");
  }

  const email = formData.get("email") as string;
  const roleToGrant = formData.get("role") as Role;

  if (!email || !roleToGrant) throw new Error("Missing required fields.");

  // 🚨 2. MANAGERS CANNOT INVITE ADMINS
  if (inviter.role === "MANAGER" && roleToGrant === "ADMIN") {
    throw new Error("Managers cannot grant Admin privileges.");
  }

  // Check if the user already exists in the system
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (existingUser.organizationId) {
      throw new Error("This user is already part of an organization.");
    }
    // If they exist but have no org, attach them to your workspace
    await prisma.user.update({
      where: { email },
      data: { organizationId: inviter.organizationId, role: roleToGrant },
    });
  } else {
    // Create a shell profile. When they sign in with this email, NextAuth takes over.
    await prisma.user.create({
      data: {
        email,
        role: roleToGrant,
        organizationId: inviter.organizationId,
      },
    });
  }

  revalidatePath("/settings");
}
