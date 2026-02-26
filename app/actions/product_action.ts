"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

/**
 * 🚨 PRODUCT RBAC CHECKER
 * Products are global to the Org, but restricted by Role.
 */
async function verifyProductAccess(
  dbUser: AuthUserWithTeam,
  productId?: string,
) {
  // 1. Role Check: Employees cannot modify the catalog
  if (dbUser.role === "EMPLOYEE") {
    throw new Error(
      "Unauthorized: Only Admins and Managers can modify products.",
    );
  }

  // 2. Existence/Org Check (if updating/deleting)
  if (productId) {
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
        organizationId: dbUser.organizationId,
      },
    });
    if (!product) throw new Error("Product not found.");
    return product;
  }
}

// ==========================================
// PRODUCT ACTIONS
// ==========================================

export async function createProduct(formData: FormData) {
  const dbUser = await getAuthenticatedUser();
  await verifyProductAccess(dbUser); // Ensure role permission

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const sku = formData.get("sku") as string;

  await prisma.product.create({
    data: {
      name,
      description: description || null,
      price,
      sku: sku || null,
      isActive: true,
      organizationId: dbUser.organizationId,
    },
  });

  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProduct(id: string) {
  const dbUser = await getAuthenticatedUser();

  // 🚨 RBAC check ensures product belongs to org AND user has role permissions
  await verifyProductAccess(dbUser, id);

  await prisma.product.delete({
    where: { id: id },
  });

  revalidatePath("/products");
}
