"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ContactType, User } from "@prisma/client";
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

async function verifyContactAccess(
  contactId: string,
  currentUser: AuthUserWithTeam,
) {
  const targetContact = await prisma.contact.findUnique({
    where: {
      id: contactId,
      organizationId: currentUser.organizationId,
    },
  });

  if (!targetContact) throw new Error("Contact not found.");

  // 👑 ADMINS: Full Access
  if (currentUser.role === "ADMIN") return targetContact;

  // 👔 MANAGERS: Own + Team
  if (currentUser.role === "MANAGER") {
    const validTeamIds = currentUser.teamMembers.map((m: User) => m.id);
    if (
      targetContact.employeeId !== currentUser.id &&
      !validTeamIds.includes(targetContact.employeeId)
    ) {
      throw new Error(
        "Security Violation: Access denied to team-external record.",
      );
    }
    return targetContact;
  }

  // 💼 EMPLOYEES: Own Only
  if (targetContact.employeeId !== currentUser.id) {
    throw new Error(
      "Security Violation: You can only modify your own contacts.",
    );
  }

  return targetContact;
}

// ==========================================
// CONTACT ACTIONS
// ==========================================

export async function createContact(formData: FormData) {
  const dbUser = await getAuthenticatedUser();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const companyId = formData.get("companyId") as string;
  const context = formData.get("context") as string;

  await prisma.contact.create({
    data: {
      name,
      email,
      companyId: companyId || null,
      relationshipContext: context || null,
      status: "ACTIVE",
      employeeId: dbUser.id,
      organizationId: dbUser.organizationId,
    },
  });

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function updateContact(id: string, formData: FormData) {
  const dbUser = await getAuthenticatedUser();
  await verifyContactAccess(id, dbUser);

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const companyId = formData.get("companyId") as string;
  const context = formData.get("context") as string;
  const status = formData.get("status") as string;

  await prisma.contact.update({
    where: { id: id },
    data: {
      name,
      email,
      companyId: companyId || null,
      relationshipContext: context || null,
      status: status || "ACTIVE",
    },
  });

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function deleteContact(id: string) {
  const dbUser = await getAuthenticatedUser();
  await verifyContactAccess(id, dbUser);

  await prisma.contact.delete({
    where: { id: id },
  });

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function convertLeadToContact(
  contactId: string,
  targetCompanyId?: string,
) {
  const dbUser = await getAuthenticatedUser();
  await verifyContactAccess(contactId, dbUser);

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      type: ContactType.CONTACT,
      ...(targetCompanyId && { companyId: targetCompanyId }),
    },
  });

  revalidatePath("/leads");
  revalidatePath("/contacts");
  redirect("/contacts");
}
