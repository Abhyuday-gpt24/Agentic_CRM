import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import Image from "next/image";
import { updateProfile } from "../../actions/profile_action";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: true },
  });

  if (!dbUser) redirect("/");

  const userImage =
    session.user.image ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${dbUser.name || "User"}&backgroundColor=e2e8f0`;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-8 border-b border-slate-700 pb-6">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-slate-600 mt-1">
          Manage your personal information and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Quick Info */}
        <div className="col-span-1">
          <div className="bg-[#242E3D] border border-slate-700 rounded-xl p-6 flex flex-col items-center text-center shadow-sm">
            <div className="w-24 h-24 rounded-full bg-slate-700 overflow-hidden border-4 border-slate-600 mb-4 relative">
              <Image
                src={userImage}
                alt="User"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <h2 className="text-lg font-bold text-white">{dbUser.name}</h2>
            <p className="text-sm text-slate-400 mb-4">{dbUser.email}</p>

            <div className="w-full pt-4 border-t border-slate-700/50 flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Role</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] tracking-wide ${
                    dbUser.role === "ADMIN"
                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      : dbUser.role === "MANAGER"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                  }`}
                >
                  {dbUser.role}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Workspace</span>
                <span className="font-semibold text-slate-300">
                  {dbUser.organization?.name || "None"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Update Form */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="bg-[#242E3D] border border-slate-700 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-white mb-4">
              Personal Details
            </h3>

            <form action={updateProfile} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-400 mb-1"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={dbUser.name || ""}
                  required
                  className="w-full bg-[#1E2532] text-white placeholder-slate-500 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-600 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-400 mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  defaultValue={dbUser.email || ""}
                  disabled
                  className="w-full bg-[#1E2532]/50 text-slate-500 rounded-lg px-4 py-2.5 border border-slate-700 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Email addresses cannot be changed as they are tied to your
                  authentication provider.
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
