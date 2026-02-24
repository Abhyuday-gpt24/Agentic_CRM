"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createContact(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser || !dbUser.organizationId)
    throw new Error("No organization found");

  // Extract form data
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const companyId = formData.get("companyId") as string;
  const context = formData.get("context") as string; // <-- Catch the new field

  // Create the new Client
  await prisma.client.create({
    data: {
      name,
      email,
      companyId: companyId || null, // 🚨 SAVING THE RELATION
      relationshipContext: context || null,
      status: "ACTIVE",
      employeeId: dbUser.id,
      organizationId: dbUser.organizationId,
    },
  });

  // Refresh the table and redirect
  revalidatePath("/contacts");
  redirect("/contacts");
}

// Add this below your createContact function

export async function updateContact(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser || !dbUser.organizationId)
    throw new Error("No organization found");

  // Extract form data
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const companyId = formData.get("companyId") as string;
  const context = formData.get("context") as string;
  const status = formData.get("status") as string; // We'll add a status dropdown to the edit form

  // Update the Client in the database
  // We use a composite where clause to ensure they can only edit clients in their Org
  await prisma.client.update({
    where: {
      id: id,
      organizationId: dbUser.organizationId, // Security check
    },
    data: {
      name,
      email,
      companyId: companyId || null,
      relationshipContext: context || null,
      status: status || "ACTIVE",
    },
  });

  // Refresh the table and redirect
  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function deleteContact(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!dbUser || !dbUser.organizationId) throw new Error("Unauthorized");

  await prisma.client.delete({
    where: {
      id: id,
      organizationId: dbUser.organizationId, // Security check
    },
  });

  revalidatePath("/contacts");
  redirect("/contacts");
}
