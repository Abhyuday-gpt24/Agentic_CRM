"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthUserWithTeam } from "../lib/rbac_helpers";
import { AccountType } from "@prisma/client";

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

// 🚨 COMPANY RBAC CHECKER
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
// INTERNAL HELPER TO PARSE SFA FORM DATA
// ==========================================
function extractCompanySfaFields(formData: FormData) {
  const rawAnnualRevenue = formData.get("annualRevenue") as string;
  const rawType = formData.get("type") as string;

  return {
    name: formData.get("name") as string,
    type: (rawType as AccountType) || AccountType.PROSPECT,
    website: (formData.get("website") as string) || null,
    phone: (formData.get("phone") as string) || null,

    industry: (formData.get("industry") as string) || null,
    employeeCount: (formData.get("employeeCount") as string) || null,
    annualRevenue: rawAnnualRevenue ? parseFloat(rawAnnualRevenue) : null,
    tickerSymbol: (formData.get("tickerSymbol") as string) || null,

    billingStreet: (formData.get("billingStreet") as string) || null,
    billingCity: (formData.get("billingCity") as string) || null,
    billingState: (formData.get("billingState") as string) || null,
    billingZip: (formData.get("billingZip") as string) || null,
    billingCountry: (formData.get("billingCountry") as string) || null,
  };
}

// ==========================================
// 2. COMPANY ACTIONS
// ==========================================

export async function createCompany(formData: FormData) {
  const dbUser = await getAuthenticatedUser();
  const data = extractCompanySfaFields(formData);

  await prisma.company.create({
    data: {
      ...data,
      organizationId: dbUser.organizationId,
    },
  });

  revalidatePath("/companies");
  redirect("/companies");
}

export async function updateCompany(id: string, formData: FormData) {
  const dbUser = await getAuthenticatedUser();
  await verifyCompanyAccess(id, dbUser); // Ensure they have access

  const data = extractCompanySfaFields(formData);

  await prisma.company.update({
    where: { id },
    data: data,
  });

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`); // Helpful if you add a detail page later
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
