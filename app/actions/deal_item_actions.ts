"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { User } from "@prisma/client";
import { AuthUserWithTeam } from "../lib/rbac_helpers";

// ==========================================
// STRICT TYPES & SECURITY HELPERS
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

// Internal helper to automatically sum up all items and update the Deal Amount AND Expected Revenue
async function recalculateDealTotal(dealId: string) {
  // Get the current deal to find its probability
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { probability: true },
  });

  if (!deal) return;

  const aggregation = await prisma.dealItem.aggregate({
    where: { dealId },
    _sum: { totalPrice: true },
  });

  const newTotal = aggregation._sum.totalPrice || 0;

  // 🚨 Recalculate Expected Revenue based on the new total!
  const newExpectedRevenue =
    deal.probability !== null ? newTotal * (deal.probability / 100) : null;

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      amount: newTotal,
      expectedRevenue: newExpectedRevenue,
    },
  });
}

// ==========================================
// DEAL ITEM ACTIONS
// ==========================================

export async function addDealItem(dealId: string, formData: FormData) {
  const dbUser = await getAuthenticatedUser();

  // 1. Ensure the user has permission to edit this specific deal
  await verifyDealAccess(dealId, dbUser);

  const productId = formData.get("productId")?.toString() || null;
  const customName = formData.get("customName")?.toString();
  const quantity = parseInt(formData.get("quantity")?.toString() || "1", 10);
  const customPrice = parseFloat(
    formData.get("customPrice")?.toString() || "0",
  );

  let name = customName || "Custom Item";
  let unitPrice = customPrice;

  // 2. If a catalog product is selected, fetch its exact current price and name
  if (productId) {
    const catalogProduct = await prisma.product.findUnique({
      where: {
        id: productId,
        organizationId: dbUser.organizationId,
      },
    });

    if (catalogProduct) {
      name = catalogProduct.name;
      unitPrice = catalogProduct.price;
    }
  }

  const totalPrice = unitPrice * quantity;

  // 3. Create the Line Item
  await prisma.dealItem.create({
    data: {
      dealId,
      productId,
      name,
      quantity,
      unitPrice,
      totalPrice,
    },
  });

  // 4. Recalculate the grand total AND expected revenue
  await recalculateDealTotal(dealId);

  // 5. Revalidate caches so the UI updates instantly
  revalidatePath(`/pipeline`);
  revalidatePath(`/pipeline/${dealId}`);
}

export async function removeDealItem(dealId: string, itemId: string) {
  const dbUser = await getAuthenticatedUser();

  await verifyDealAccess(dealId, dbUser);

  await prisma.dealItem.deleteMany({
    where: {
      id: itemId,
      dealId: dealId,
    },
  });

  await recalculateDealTotal(dealId);

  revalidatePath(`/pipeline`);
  revalidatePath(`/pipeline/${dealId}`);
}
