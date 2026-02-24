import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";

export default async function SettingsPage() {
  // 1. Authenticate and fetch the current user
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  // 2. Fetch user with their organization and all team members
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      organization: {
        include: {
          users: {
            orderBy: { role: "asc" }, // Admins will appear at the top
          },
        },
      },
    },
  });

  if (!currentUser || !currentUser.organization) {
    redirect("/");
  }

  const { organization } = currentUser;

  // ==========================================
  // SERVER ACTIONS (Database Mutations)
  // ==========================================

  // Action to update the user's profile name
  async function updateProfile(formData: FormData) {
    "use server";
    const newName = formData.get("name") as string;
    const userEmail = session?.user?.email;

    if (!newName || !userEmail) return;

    await prisma.user.update({
      where: { email: userEmail },
      data: { name: newName },
    });

    // Forces Next.js to clear the cache and show the updated name instantly
    revalidatePath("/settings");
  }

  // ==========================================
  // UI RENDER
  // ==========================================
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your account and workspace preferences.
        </p>
      </div>

      {/* SECTION 1: Personal Information */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">
            Personal Profile
          </h2>
        </div>
        <div className="p-6">
          <form action={updateProfile} className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address (Read-only)
              </label>
              <input
                type="email"
                disabled
                defaultValue={currentUser.email || ""}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Display Name
              </label>
              <input
                name="name"
                type="text"
                required
                defaultValue={currentUser.name || ""}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </form>
        </div>
      </section>

      {/* SECTION 2: Workspace Details */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Workspace</h2>
        </div>
        <div className="p-6">
          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                disabled
                defaultValue={organization.name}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-2">
                Only organization admins can change the workspace name.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Team Directory */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Team Members</h2>
          {currentUser.role === "ADMIN" && (
            <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-800 transition-colors">
              + Invite Member
            </button>
          )}
        </div>
        <div className="p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organization.users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 text-sm">
                          {user.name || "Pending Invite"}
                          {user.id === currentUser.id && " (You)"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-slate-500">
                    Active
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
