import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route"; // Adjust path if needed
import { prisma } from "../../lib/prisma"; // Adjust path if needed
import Link from "next/link";

// Helper to color-code statuses dynamically
function getStatusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "ACTIVE" || s === "WON") {
    return "bg-green-500/20 text-green-400";
  }
  if (s === "NEGOTIATION" || s === "PROPOSAL") {
    return "bg-orange-500/20 text-orange-400";
  }
  if (s === "LOST") {
    return "bg-red-500/20 text-red-400";
  }
  return "bg-blue-500/20 text-blue-400"; // Default (LEAD, DISCOVERY, etc)
}

// Helper to format dates cleanly
function formatDate(date: Date | null) {
  if (!date) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function ContactsPage() {
  // 1. Authenticate & Get User
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, organizationId: true },
  });

  if (!dbUser || !dbUser.organizationId) {
    redirect("/"); // Redirect to setup if no org
  }

  // 2. Fetch Real Data from Prisma (Role-Based Access)
  const clients = await prisma.client.findMany({
    where: {
      organizationId: dbUser.organizationId,
      // If they are just an EMPLOYEE, only show them their own leads.
      // If ADMIN/MANAGER, show all leads in the org.
      ...(dbUser.role === "EMPLOYEE" ? { employeeId: dbUser.id } : {}),
    },
    orderBy: {
      updatedAt: "desc", // Show recently updated leads first
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Contacts & Leads</h1>
        <Link
          href="/contacts/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          + New Lead
        </Link>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-[#1E2532] text-slate-400 font-semibold uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Company</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Last Contact</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {clients.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  {`No contacts found. Click "+ New Lead" to get started.`}
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-slate-800/50 transition"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{client.name}</div>
                    <div className="text-xs text-slate-500">{client.email}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {client.company || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-semibold ${getStatusBadge(
                        client.status,
                      )}`}
                    >
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {formatDate(client.lastContactedAt)}
                  </td>
                  <td className="px-6 py-4 flex gap-3">
                    {/* The Detail View (we'll build this later) */}
                    <Link
                      href={`/contacts/${client.id}/view`}
                      className="text-blue-400 hover:text-blue-300 transition"
                    >
                      View
                    </Link>

                    {/* The Edit View we just built */}
                    <Link
                      href={`/contacts/${client.id}/edit`}
                      className="text-emerald-400 hover:text-emerald-300 transition"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
