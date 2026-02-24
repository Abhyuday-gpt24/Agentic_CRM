"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser || !dbUser.organizationId)
    throw new Error("No organization found");

  if (dbUser.role === "EMPLOYEE") {
    throw new Error(
      "Unauthorized: Only Admins and Managers can modify the product catalog.",
    );
  }

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser || !dbUser.organizationId) throw new Error("Unauthorized");

  if (dbUser.role === "EMPLOYEE") {
    throw new Error(
      "Unauthorized: Only Admins and Managers can modify the product catalog.",
    );
  }

  await prisma.product.delete({
    where: {
      id: id,
      organizationId: dbUser.organizationId,
    },
  });

  revalidatePath("/products");
}
