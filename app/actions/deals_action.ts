"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DealStage, ContactType, User } from "@prisma/client";
// 🚨 Import the centralized type
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

// 🚨 SECURE RBAC CHECKER FOR DEALS
async function verifyDealAccess(dealId: string, currentUser: AuthUserWithTeam) {
  const targetDeal = await prisma.deal.findUnique({
    where: {
      id: dealId,
      organizationId: currentUser.organizationId,
    },
  });

  if (!targetDeal) throw new Error("Deal not found.");

  // 👑 ADMINS: Full access
  if (currentUser.role === "ADMIN") return targetDeal;

  // 👔 MANAGERS: Access to own deals and team deals
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

  // 💼 EMPLOYEES: Access to own deals only
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
  await verifyDealAccess(dealId, dbUser);

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      stage: newStage as DealStage,
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
      clientId,
      companyId: companyId || null,
      organizationId: dbUser.organizationId,
      employeeId: dbUser.id,
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
