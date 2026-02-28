"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const name = formData.get("name") as string;

  if (!name || name.trim() === "") {
    throw new Error("Name cannot be empty");
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data: { name: name.trim() },
  });

  // Revalidate the profile page to show the new name instantly
  revalidatePath("/profile");
}
