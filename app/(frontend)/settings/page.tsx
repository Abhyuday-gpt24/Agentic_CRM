import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";

// Import your split components
import ProfileSection from "./components/profile_section";
import WorkspaceSection from "./components/workspace_section";
import TeamSection from "./components/team_section";

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

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-slate-600 mt-1">
          Manage your account and workspace preferences.
        </p>
      </div>

      <ProfileSection email={currentUser.email} name={currentUser.name} />

      <WorkspaceSection organizationName={currentUser.organization.name} />

      <TeamSection
        users={currentUser.organization.users}
        currentUserId={currentUser.id}
        currentUserRole={currentUser.role}
      />
    </div>
  );
}
