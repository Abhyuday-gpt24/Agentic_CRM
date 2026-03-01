"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DealStage, ContactType, User, DealType } from "@prisma/client";
import { AuthUserWithTeam } from "../lib/rbac_helpers";

// ==========================================
// STRICT TYPES & SECURITY HELPERS
// ==========================================

type ParsedDealItem = {
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

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

async function verifyDealAccess(dealId: string, currentUser: AuthUserWithTeam) {
  const targetDeal = await prisma.deal.findUnique({
    where: {
      id: dealId,
      organizationId: currentUser.organizationId,
    },
  });

  if (!targetDeal) throw new Error("Deal not found.");

  if (currentUser.role === "ADMIN") return targetDeal;

  if (currentUser.role === "MANAGER") {
    const validTeamIds = currentUser.teamMembers.map((m: User) => m.id);
    if (
      targetDeal.employeeId !== currentUser.id &&
      !validTeamIds.includes(targetDeal.employeeId)
    ) {
      throw new Error(
        "Security Violation: Access denied to team-external record.",
      );
    }
    return targetDeal;
  }

  if (targetDeal.employeeId !== currentUser.id) {
    throw new Error("Security Violation: You can only modify your own deals.");
  }

  return targetDeal;
}

// ==========================================
// DEAL ACTIONS
// ==========================================

export async function updateDealStage(dealId: string, newStage: string) {
  const dbUser = await getAuthenticatedUser();
  const deal = await verifyDealAccess(dealId, dbUser);

  let autoProbability = deal.probability;
  if (newStage === "WON") autoProbability = 100;
  if (newStage === "LOST") autoProbability = 0;

  const expectedRevenue =
    autoProbability !== null ? deal.amount * (autoProbability / 100) : null;

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      stage: newStage as DealStage,
      probability: autoProbability,
      expectedRevenue: expectedRevenue,
    },
  });

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function createDeal(formData: FormData) {
  const dbUser = await getAuthenticatedUser();

  const name = formData.get("name") as string;
  const stage = formData.get("stage") as string;
  const clientId = formData.get("clientId") as string;
  const companyId = formData.get("companyId") as string;
  const amount = parseFloat(formData.get("amount") as string) || 0;

  // 🚨 DELEGATION LOGIC: Resolve the Owner
  let targetEmployeeId = dbUser.id; // Default to current user
  const requestedOwnerId = formData.get("employeeId") as string;

  if (requestedOwnerId && requestedOwnerId !== dbUser.id) {
    if (dbUser.role === "ADMIN") {
      targetEmployeeId = requestedOwnerId;
    } else if (dbUser.role === "MANAGER") {
      const isValidTeamMember = dbUser.teamMembers.some(
        (tm) => tm.id === requestedOwnerId,
      );
      if (isValidTeamMember) {
        targetEmployeeId = requestedOwnerId;
      } else {
        throw new Error(
          "Security Violation: Managers can only assign deals to their own team.",
        );
      }
    }
  }

  const rawProbability = formData.get("probability") as string;
  const probability = rawProbability ? parseInt(rawProbability, 10) : null;
  const rawDealType = formData.get("dealType") as string;
  const nextStep = (formData.get("nextStep") as string) || null;

  const expectedRevenue =
    probability !== null ? amount * (probability / 100) : null;

  const lineItemsString = formData.get("lineItems") as string;
  let lineItems: ParsedDealItem[] = [];

  if (lineItemsString) {
    try {
      lineItems = JSON.parse(lineItemsString);
    } catch (error) {
      throw new Error("Failed to parse line items.");
    }
  }

  const validItems = lineItems.filter(
    (item) => item.name.trim() !== "" && item.quantity > 0,
  );

  await prisma.deal.create({
    data: {
      name,
      amount,
      stage: (stage as DealStage) || DealStage.DISCOVERY,
      probability,
      expectedRevenue,
      dealType: rawDealType ? (rawDealType as DealType) : null,
      nextStep,
      clientId,
      companyId: companyId || null,
      organizationId: dbUser.organizationId,
      employeeId: targetEmployeeId, // 🚨 Use the resolved owner
      dealItems: {
        create: validItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          productId: item.productId || null,
        })),
      },
    },
  });

  await prisma.contact.update({
    where: { id: clientId },
    data: { type: ContactType.CONTACT },
  });

  revalidatePath("/pipeline");
  revalidatePath("/contacts");
  revalidatePath("/leads");
  redirect("/pipeline");
}

export async function deleteDeal(dealId: string) {
  const dbUser = await getAuthenticatedUser();
  await verifyDealAccess(dealId, dbUser);

  await prisma.deal.delete({
    where: { id: dealId },
  });

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function updateDeal(dealId: string, formData: FormData) {
  const dbUser = await getAuthenticatedUser();
  const deal = await verifyDealAccess(dealId, dbUser);

  const name = formData.get("name") as string;
  const stage = formData.get("stage") as DealStage;
  const closeDateString = formData.get("closeDate") as string;

  // 🚨 DELEGATION LOGIC: Resolve the Owner for updates
  let targetEmployeeId = deal.employeeId; // Default to current owner
  const requestedOwnerId = formData.get("employeeId") as string;

  if (requestedOwnerId && requestedOwnerId !== deal.employeeId) {
    if (dbUser.role === "ADMIN") {
      targetEmployeeId = requestedOwnerId;
    } else if (dbUser.role === "MANAGER") {
      const isValidTeamMember =
        dbUser.teamMembers.some((tm) => tm.id === requestedOwnerId) ||
        requestedOwnerId === dbUser.id;

      if (isValidTeamMember) {
        targetEmployeeId = requestedOwnerId;
      } else {
        throw new Error(
          "Security Violation: Managers can only re-assign to their own team.",
        );
      }
    }
  }

  const rawProbability = formData.get("probability") as string;
  const probability = rawProbability ? parseInt(rawProbability, 10) : null;
  const rawDealType = formData.get("dealType") as string;
  const nextStep = (formData.get("nextStep") as string) || null;

  const expectedRevenue =
    probability !== null ? deal.amount * (probability / 100) : null;

  const closeDate = closeDateString ? new Date(closeDateString) : null;

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      name,
      stage,
      closeDate,
      probability,
      expectedRevenue,
      dealType: rawDealType ? (rawDealType as DealType) : null,
      nextStep,
      employeeId: targetEmployeeId, // 🚨 Apply reassignment
    },
  });

  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${dealId}/edit`);
  redirect("/pipeline");
}
