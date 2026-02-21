import Sidebar from "./components/sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "../lib/prisma"; // Adjust path based on your lib location
import OrgSetupForm from "./components/onboarding/org_setup"; // The component we just built

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Session Protection
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/");
  }

  // 2. Database Identity Check
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: true },
  });

  if (!dbUser) {
    redirect("/");
  }

  // 3. THE INTERCEPTOR: Force Org Setup if missing
  if (!dbUser.organizationId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        {/* This component handles the Server Action to create the org */}
        <OrgSetupForm />
      </div>
    );
  }
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* The Collapsible Sidebar */}
      <Sidebar />

      {/* The Main SPA Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
