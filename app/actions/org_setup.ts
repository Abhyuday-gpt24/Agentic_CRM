"use server"; // 🚨 CRUCIAL: Must be at the very top!

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";

export async function createOrganization(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  // 1. Extract all fields from the form
  const name = formData.get("orgName") as string;
  const industry = formData.get("industry") as string;
  const employeeCount = formData.get("employeeCount") as string;
  const website = formData.get("website") as string;
  const address = formData.get("address") as string;

  if (!name) {
    throw new Error("Organization name is required.");
  }

  // 2. Create the org and include the new details
  // Using `|| null` ensures empty optional strings are saved as actual NULLs in the DB
  const newOrg = await prisma.organization.create({
    data: {
      name,
      industry: industry || null,
      employeeCount: employeeCount || null,
      website: website || null,
      address: address || null,
    },
  });

  // 3. Link the user to the new Org and promote to ADMIN
  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      organizationId: newOrg.id,
      role: "ADMIN",
    },
  });

  // 4. Tell Next.js to refresh the layout and remove the setup screen
  revalidatePath("/frontend");
}
