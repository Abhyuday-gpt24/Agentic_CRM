import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import Link from "next/link";
import ContactCard from "./contact_card";
import { User, Prisma } from "@prisma/client";

// ==========================================
// 1. STRICT TYPES & RBAC LOGIC
// ==========================================

// 🚨 FIXED: We use Omit to remove the nullable organizationId, and replace it with a strict string.
type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

async function getFilteredContacts(dbUser: AuthUserWithTeam) {
  // Now TypeScript knows dbUser.organizationId is strictly a string!
  const contactFilter: Prisma.ContactWhereInput = {
    organizationId: dbUser.organizationId,
  };

  if (dbUser.role === "ADMIN") {
    // 👑 ADMIN: Sees all contacts in the organization
  } else if (dbUser.role === "MANAGER") {
    // 👔 MANAGER: Sees their own contacts + contacts owned by their team
    const teamIds = dbUser.teamMembers.map((member: User) => member.id);
    contactFilter.employeeId = {
      in: [dbUser.id, ...teamIds],
    };
  } else {
    // 💼 EMPLOYEE: Sees ONLY their own contacts
    contactFilter.employeeId = dbUser.id;
  }

  return await prisma.contact.findMany({
    where: contactFilter,
    include: {
      companyRecord: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================
export default async function ContactsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/");
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) {
    redirect("/");
  }

  // 🚨 Cast the returned database record to our strict type
  const authUser = dbUser as AuthUserWithTeam;

  const contacts = await getFilteredContacts(authUser);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Master Directory
          </h1>
          <p className="text-sm text-slate-600">
            All leads and qualified contacts in your CRM.
          </p>
        </div>
        <Link
          href="/contacts/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
        >
          + Add Person
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-12 text-center text-slate-400 italic">
          {'Your Rolodex is empty! Click "+ Add Person" to get started.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contacts.map((contact) => {
            const canEdit =
              authUser.role === "ADMIN" ||
              authUser.role === "MANAGER" ||
              contact.employeeId === authUser.id;

            return (
              <ContactCard
                key={contact.id}
                contact={contact}
                canEdit={canEdit}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
