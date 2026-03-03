import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";
import { updateContact } from "../../../../actions/contact_action";
import { User } from "@prisma/client";
import { getSecureOwnershipFilter } from "../../../../lib/rbac_helpers";

// ==========================================
// 1. STRICT TYPES
// ==========================================

type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

export default async function EditContactPage({
  searchParams,
}: {
  searchParams: Promise<{ id: string; returnTo?: string }>;
}) {
  const { id, returnTo } = await searchParams;

  // 1. Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // 🚨 Fetch User & Team (Required for Manager RBAC)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const authUser = dbUser as AuthUserWithTeam;

  // 🚨 2. Get the dynamic ownership filter
  const ownershipFilter = getSecureOwnershipFilter(authUser);

  // 🚨 3. Fetch the specific contact WITH security check
  const contact = await prisma.contact.findFirst({
    where: {
      id: id,
      organizationId: authUser.organizationId,
      ...ownershipFilter, // 💥 Ensures user has permission to edit this specific contact
    },
  });

  if (!contact) {
    return (
      <div className="p-8 text-center text-slate-400">
        {"Contact not found or you don't have permission to view it."}
      </div>
    );
  }

  const targetRoute = returnTo
    ? returnTo
    : contact.type === "LEAD"
      ? "/leads"
      : "/contacts";

  // 4. Fetch companies for the organization (Shared resource)
  const companies = await prisma.company.findMany({
    where: { organizationId: authUser.organizationId },
    orderBy: { name: "asc" },
  });

  // 🚨 5. Determine who this user is allowed to assign leads to (For Reassignment)
  let assignableUsers: { id: string; name: string }[] = [];

  if (authUser.role === "ADMIN") {
    const allUsers = await prisma.user.findMany({
      where: { organizationId: authUser.organizationId },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    assignableUsers = allUsers.map((u) => ({
      id: u.id,
      name: u.name || u.email || "Unknown User",
    }));
  } else if (authUser.role === "MANAGER") {
    assignableUsers = [
      { id: authUser.id, name: "Me (Self)" },
      ...authUser.teamMembers.map((u) => ({
        id: u.id,
        name: u.name || u.email || "Unknown User",
      })),
    ];
  }

  // 6. Bind the ID to the Server Action
  const updateContactWithId = updateContact.bind(null, contact.id);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={targetRoute}
          className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
          title="Go Back"
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
        <h1 className="text-2xl font-bold text-slate-800">
          Edit {contact.type === "LEAD" ? "Lead" : "Contact"}: {contact.name}
        </h1>
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6 md:p-8">
        <form action={updateContactWithId} className="space-y-8">
          <input type="hidden" name="id" value={contact.id} />

          {/* 🚨 Add this new hidden input so the server action can read it */}
          <input type="hidden" name="returnTo" value={targetRoute} />
          {/* SECTION 1: Core Identity */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700/50 pb-2">
              Core Identity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Record Type *
                </label>
                <select
                  id="type"
                  name="type"
                  defaultValue={contact.type}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="LEAD">Lead (Unqualified)</option>
                  <option value="CONTACT">Contact (Qualified)</option>
                </select>
              </div>

              {/* 🚨 Re-Assignment Dropdown (Only renders for Admins & Managers) */}
              {authUser.role === "ADMIN" || authUser.role === "MANAGER" ? (
                <div>
                  <label
                    htmlFor="employeeId"
                    className="block text-sm font-medium text-slate-300 mb-2"
                  >
                    Re-assign Record To
                  </label>
                  <select
                    id="employeeId"
                    name="employeeId"
                    defaultValue={contact.employeeId}
                    className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="hidden md:block"></div>
              )}

              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  defaultValue={contact.firstName || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  defaultValue={contact.lastName || ""}
                  required
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Primary Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  defaultValue={contact.email}
                  required
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="secondaryEmail"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Secondary Email
                </label>
                <input
                  type="email"
                  id="secondaryEmail"
                  name="secondaryEmail"
                  defaultValue={contact.secondaryEmail || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Professional Details */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700/50 pb-2">
              Professional Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="companyId"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Associated Account
                </label>
                <select
                  id="companyId"
                  name="companyId"
                  defaultValue={contact.companyId || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">No Account / Independent</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="tempCompanyName"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Company Name (If no Account exists)
                </label>
                <input
                  type="text"
                  id="tempCompanyName"
                  name="tempCompanyName"
                  defaultValue={contact.tempCompanyName || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="jobTitle"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Job Title
                </label>
                <input
                  type="text"
                  id="jobTitle"
                  name="jobTitle"
                  defaultValue={contact.jobTitle || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="department"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Department
                </label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  defaultValue={contact.department || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Office Phone
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  defaultValue={contact.phone || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="mobile"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Mobile Phone
                </label>
                <input
                  type="text"
                  id="mobile"
                  name="mobile"
                  defaultValue={contact.mobile || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="linkedInUrl"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  id="linkedInUrl"
                  name="linkedInUrl"
                  defaultValue={contact.linkedInUrl || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Lead Tracking & SFA */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700/50 pb-2">
              Sales Tracking
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label
                  htmlFor="leadSource"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Lead Source
                </label>
                <select
                  id="leadSource"
                  name="leadSource"
                  defaultValue={contact.leadSource || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Select Source --</option>
                  <option value="WEBSITE">Website</option>
                  <option value="COLD_CALL">Cold Call</option>
                  <option value="TRADE_SHOW">Trade Show</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="PARTNER">Partner</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="leadStatus"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Lead Status
                </label>
                <select
                  id="leadStatus"
                  name="leadStatus"
                  defaultValue={contact.leadStatus || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Select Status --</option>
                  <option value="NEW">New</option>
                  <option value="ATTEMPTED_CONTACT">Attempted Contact</option>
                  <option value="ENGAGED">Engaged</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="UNQUALIFIED">Unqualified</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="rating"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Rating
                </label>
                <select
                  id="rating"
                  name="rating"
                  defaultValue={contact.rating || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Select Rating --</option>
                  <option value="Hot">🔥 Hot</option>
                  <option value="Warm">☀️ Warm</option>
                  <option value="Cold">❄️ Cold</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: Location */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700/50 pb-2">
              Address
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label
                  htmlFor="street"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Street Address
                </label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  defaultValue={contact.street || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  defaultValue={contact.city || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  State / Province
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  defaultValue={contact.state || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="zipCode"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Zip / Postal Code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  defaultValue={contact.zipCode || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="country"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  defaultValue={contact.country || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: AI Context & Status */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700/50 pb-2">
              Status & AI Context
            </h2>
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Contact Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={contact.status}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="context"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Relationship Context (AI Notes)
                </label>
                <textarea
                  id="context"
                  name="context"
                  rows={4}
                  defaultValue={contact.relationshipContext || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-700/50">
            <Link
              href={targetRoute}
              className="px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition shadow-lg active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
