"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
// 🚨 Import the centralized type
import { AuthUserWithTeam } from "../lib/rbac_helpers";

// ==========================================
// 1. REUSABLE AUTH HELPER
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

// 🚨 COMPANY RBAC CHECKER (Keep this specific to the action file)
async function verifyCompanyAccess(
  companyId: string,
  currentUser: AuthUserWithTeam,
  isDeleteAction: boolean = false,
) {
  const targetCompany = await prisma.company.findUnique({
    where: {
      id: companyId,
      organizationId: currentUser.organizationId,
    },
  });

  if (!targetCompany) throw new Error("Company not found.");

  if (isDeleteAction && currentUser.role === "EMPLOYEE") {
    throw new Error(
      "Security Violation: Employees cannot delete company records.",
    );
  }

  return targetCompany;
}

// ==========================================
// 2. COMPANY ACTIONS
// ==========================================

export async function createCompany(formData: FormData) {
  const dbUser = await getAuthenticatedUser();

  const name = formData.get("name") as string;
  const industry = formData.get("industry") as string;
  const website = formData.get("website") as string;
  const employeeCount = formData.get("employeeCount") as string;

  await prisma.company.create({
    data: {
      name,
      industry: industry || null,
      website: website || null,
      employeeCount: employeeCount || null,
      organizationId: dbUser.organizationId,
    },
  });

  revalidatePath("/companies");
  redirect("/companies");
}

export async function deleteCompany(id: string) {
  const dbUser = await getAuthenticatedUser();

  // 🚨 RBAC CHECK (Passing 'true' to flag this as a destructive action)
  await verifyCompanyAccess(id, dbUser, true);

  await prisma.company.delete({
    where: { id: id },
  });

  revalidatePath("/companies");
}
