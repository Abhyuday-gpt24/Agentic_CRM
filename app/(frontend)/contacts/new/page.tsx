import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import ContactForm from "../components/contact_form"; // 🚨 Adjust path to where you saved it!

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string;
    returnTo?: string;
    type?: string;
  }>;
}) {
  const { companyId, returnTo, type } = await searchParams;

  const defaultType = type === "LEAD" ? "LEAD" : "CONTACT";
  const targetRoute = returnTo
    ? returnTo
    : defaultType === "LEAD"
      ? "/leads"
      : "/contacts";

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const companies = await prisma.company.findMany({
    where: { organizationId: dbUser.organizationId },
    orderBy: { name: "asc" },
  });

  let assignableUsers: { id: string; name: string }[] = [];

  // We are keeping your awesome email fallback logic completely intact!
  if (dbUser.role === "ADMIN") {
    const allUsers = await prisma.user.findMany({
      where: { organizationId: dbUser.organizationId },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    assignableUsers = allUsers.map((u) => ({
      id: u.id,
      name: u.name || u.email || "Unknown User",
    }));
  } else if (dbUser.role === "MANAGER") {
    assignableUsers = [
      { id: dbUser.id, name: "Me (Self)" },
      ...dbUser.teamMembers.map((u) => ({
        id: u.id,
        name: u.name || u.email || "Unknown User",
      })),
    ];
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={targetRoute}
          className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Add New Record</h1>
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6 md:p-8">
        {/* 🚨 Our new clean component! */}
        <ContactForm
          targetRoute={targetRoute}
          defaultType={defaultType}
          dbUser={{ id: dbUser.id, role: dbUser.role }}
          assignableUsers={assignableUsers}
          companies={companies}
          initialCompanyId={companyId || ""}
        />
      </div>
    </div>
  );
}
