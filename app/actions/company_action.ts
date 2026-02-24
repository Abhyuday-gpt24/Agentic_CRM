"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCompany(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser || !dbUser.organizationId)
    throw new Error("No organization found");

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser || !dbUser.organizationId) throw new Error("Unauthorized");

  // Optional: Only let Admins/Managers delete whole accounts
  if (dbUser.role === "EMPLOYEE") {
    throw new Error("Only managers can delete company records.");
  }

  await prisma.company.delete({
    where: {
      id: id,
      organizationId: dbUser.organizationId,
    },
  });

  revalidatePath("/companies");
}
