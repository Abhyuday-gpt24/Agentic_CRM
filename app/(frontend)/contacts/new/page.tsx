import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import { createContact } from "../../../actions/contact_action";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;

  // 1. Authenticate to get the user's Organization ID
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // 🚨 Fetch the user AND their team members for the assignment logic
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teamMembers: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  // 2. Fetch all companies for the dropdown
  const companies = await prisma.company.findMany({
    where: { organizationId: dbUser.organizationId },
    orderBy: { name: "asc" },
  });

  // 🚨 3. Determine who this user is allowed to assign leads to
  let assignableUsers: { id: string; name: string }[] = [];

  if (dbUser.role === "ADMIN") {
    // Admins can assign to anyone in the organization
    const allUsers = await prisma.user.findMany({
      where: { organizationId: dbUser.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    assignableUsers = allUsers.map((u) => ({
      id: u.id,
      name: u.name || "Unknown User",
    }));
  } else if (dbUser.role === "MANAGER") {
    // Managers can assign to themselves or their team
    assignableUsers = [
      { id: dbUser.id, name: "Me (Self)" },
      ...dbUser.teamMembers.map((u) => ({
        id: u.id,
        name: u.name || "Unknown User",
      })),
    ];
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/contacts"
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
        <form action={createContact} className="space-y-8">
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
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="LEAD">Lead (Unqualified)</option>
                  <option value="CONTACT">Contact (Qualified)</option>
                </select>
              </div>

              {/* 🚨 Lead Assignment Dropdown (Only renders for Admins & Managers) */}
              {dbUser.role === "ADMIN" || dbUser.role === "MANAGER" ? (
                <div>
                  <label
                    htmlFor="employeeId"
                    className="block text-sm font-medium text-slate-300 mb-2"
                  >
                    Assign Record To *
                  </label>
                  <select
                    id="employeeId"
                    name="employeeId"
                    defaultValue={dbUser.id}
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
                <div className="hidden md:block"></div> /* Spacer for Employees */
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
                  placeholder="Bruce"
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
                  required
                  placeholder="Wayne"
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
                  required
                  placeholder="bruce@wayne.com"
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
                  placeholder="batman@cave.org"
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
                  defaultValue={companyId || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">No Account / Independent</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}{" "}
                      {company.industry ? `(${company.industry})` : ""}
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
                  placeholder="Wayne Enterprises"
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
                  placeholder="CEO"
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
                  placeholder="Executive Board"
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
                  placeholder="+1 (555) 0100"
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
                  placeholder="+1 (555) 0199"
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
                  placeholder="https://linkedin.com/in/..."
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
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
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
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: AI Context */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700/50 pb-2">
              AI Context
            </h2>
            <label
              htmlFor="context"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Relationship Context
            </label>
            <textarea
              id="context"
              name="context"
              rows={3}
              placeholder="Where did you meet? What are their pain points? The AI will use this to draft emails."
              className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-700/50">
            <Link
              href="/contacts"
              className="px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg active:scale-95"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
