import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "../lib/prisma"; // Adjust path if necessary
import Sidebar from "./components/sidebar"; // Your client component sidebar
import Header from "./components/header"; // Your client component header
import OrgSetup from "./components/onboarding/org_setup"; // Your onboarding component
import FloatingWidget from "./components/floating_chat_widget";

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Session Protection
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  // 2. Fetch User & Org Data
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  // 3. THE INTERCEPTOR: Force Org Setup if missing
  if (!dbUser.organizationId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <OrgSetup />
      </div>
    );
  }

  // 4. THE AUTHENTICATED SHELL
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Client Component Sidebar */}
      <Sidebar
        orgName={dbUser.organization?.name}
        userName={dbUser.name || "User"}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Global Top Header */}
        <Header />

        {/* Dynamic Page Content (This is where page.tsx loads) */}
        <main className="flex-1 overflow-y-auto pb-10">{children}</main>
        <FloatingWidget />
      </div>
    </div>
  );
}
