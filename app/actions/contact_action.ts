"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ContactType, LeadSource, LeadStatus, User } from "@prisma/client";
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
// INTERNAL HELPER TO PARSE SFA FORM DATA
// ==========================================
function extractSfaFields(formData: FormData) {
  const firstName = (formData.get("firstName") as string) || null;
  const lastName = (formData.get("lastName") as string) || ""; // Required
  // Auto-generate the legacy 'name' field for backward compatibility
  const name = [firstName, lastName].filter(Boolean).join(" ");

  const rawType = formData.get("type") as string;
  const rawLeadSource = formData.get("leadSource") as string;
  const rawLeadStatus = formData.get("leadStatus") as string;

  return {
    type: (rawType as ContactType) || ContactType.LEAD,
    name,
    firstName,
    lastName,
    email: formData.get("email") as string,
    secondaryEmail: (formData.get("secondaryEmail") as string) || null,

    companyId: (formData.get("companyId") as string) || null,
    tempCompanyName: (formData.get("tempCompanyName") as string) || null,

    jobTitle: (formData.get("jobTitle") as string) || null,
    department: (formData.get("department") as string) || null,
    phone: (formData.get("phone") as string) || null,
    mobile: (formData.get("mobile") as string) || null,
    linkedInUrl: (formData.get("linkedInUrl") as string) || null,

    // Safely parse enums to avoid TS errors on empty strings
    leadSource: rawLeadSource ? (rawLeadSource as LeadSource) : null,
    leadStatus: rawLeadStatus ? (rawLeadStatus as LeadStatus) : null,
    rating: (formData.get("rating") as string) || null,

    street: (formData.get("street") as string) || null,
    city: (formData.get("city") as string) || null,
    state: (formData.get("state") as string) || null,
    zipCode: (formData.get("zipCode") as string) || null,
    country: (formData.get("country") as string) || null,

    relationshipContext: (formData.get("context") as string) || null,
  };
}

// ==========================================
// CONTACT ACTIONS
// ==========================================

export async function createContact(formData: FormData) {
  const dbUser = await getAuthenticatedUser();
  const data = extractSfaFields(formData);

  // 🚨 1. Determine Ownership (Lead Routing Logic)
  let targetEmployeeId = dbUser.id; // Default to the person creating it
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
          "Security Violation: Managers can only assign leads to their own team.",
        );
      }
    }
    // Note: If an EMPLOYEE maliciously submits a different ID via dev tools, it is ignored and falls back to their own ID.
  }

  await prisma.contact.create({
    data: {
      ...data,
      status: "ACTIVE",
      employeeId: targetEmployeeId, // 🚨 Uses the safely resolved Owner ID
      organizationId: dbUser.organizationId,
    },
  });

  // Redirect based on the type created
  if (data.type === "LEAD") {
    revalidatePath("/leads");
    redirect("/leads");
  } else {
    revalidatePath("/contacts");
    redirect("/contacts");
  }
}

export async function updateContact(id: string, formData: FormData) {
  const dbUser = await getAuthenticatedUser();
  const existingContact = await verifyContactAccess(id, dbUser);
  const data = extractSfaFields(formData);

  // 🚨 Lead Re-assignment Logic (Only Admins & Managers can change ownership)
  let targetEmployeeId = existingContact.employeeId; // Default to existing owner
  const requestedOwnerId = formData.get("employeeId") as string;

  if (requestedOwnerId && requestedOwnerId !== existingContact.employeeId) {
    if (dbUser.role === "ADMIN") {
      targetEmployeeId = requestedOwnerId;
    } else if (dbUser.role === "MANAGER") {
      // Managers can reassign to themselves or their team
      const isValidTeamMember =
        dbUser.teamMembers.some((tm) => tm.id === requestedOwnerId) ||
        requestedOwnerId === dbUser.id;

      if (isValidTeamMember) {
        targetEmployeeId = requestedOwnerId;
      } else {
        throw new Error(
          "Security Violation: Managers can only assign leads to their own team.",
        );
      }
    }
  }

  await prisma.contact.update({
    where: { id: id },
    data: {
      ...data,
      status: (formData.get("status") as string) || existingContact.status,
      employeeId: targetEmployeeId, // 🚨 Apply the safely resolved Owner ID
    },
  });

  if (data.type === "LEAD") {
    revalidatePath("/leads");
    redirect("/leads");
  } else {
    revalidatePath("/contacts");
    redirect("/contacts");
  }
}

export async function deleteContact(id: string) {
  const dbUser = await getAuthenticatedUser();
  await verifyContactAccess(id, dbUser);

  await prisma.contact.delete({
    where: { id: id },
  });

  revalidatePath("/contacts");
  revalidatePath("/leads");
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
      leadStatus: LeadStatus.QUALIFIED, // 🌟 SFA Logic: Auto-qualify on conversion
      ...(targetCompanyId && { companyId: targetCompanyId }),
    },
  });

  revalidatePath("/leads");
  revalidatePath("/contacts");
  redirect("/contacts");
}
