import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "../lib/prisma";
import Sidebar from "./components/sidebar";
import Header from "./components/header";
import OrgSetup from "./components/onboarding/org_setup";
import FloatingWidget from "./components/floating_chat_widget";
import { SidebarProvider } from "./context/sidebar_context"; // 🚨 Kept for the mobile menu toggle

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // 1. Session Protection
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: true },
  });

  if (!dbUser) redirect("/");

  // 2. Org Onboarding Interceptor
  if (!dbUser.organizationId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <OrgSetup />
      </div>
    );
  }

  // 3. Prop-Drilling Setup (No NextAuth SessionProvider needed!)
  const headerUser = {
    name: dbUser.name || session.user.name || "User",
    email: dbUser.email || session.user.email || "No Email Provided",
    image: session.user.image || null,
  };

  return (
    // 🚨 We only wrap the UI state context now. NextAuth is 100% Server-Side!
    <SidebarProvider>
      <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
        <Sidebar
          orgName={dbUser.organization?.name}
          userName={headerUser.name}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* 🚨 Passing the server-fetched user data down to the Client Component */}
          <Header user={headerUser} />

          <main className="flex-1 overflow-y-auto pb-10">{children}</main>
          <FloatingWidget />
        </div>
      </div>
    </SidebarProvider>
  );
}
