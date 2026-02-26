import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "../lib/prisma";
import Sidebar from "./components/sidebar";
import Header from "./components/header";
import OrgSetup from "./components/onboarding/org_setup";
import FloatingWidget from "./components/floating_chat_widget";
import { Providers } from "./providers"; // 🚨 Use the new unified provider

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: true },
  });

  if (!dbUser) redirect("/");

  if (!dbUser.organizationId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <OrgSetup />
      </div>
    );
  }

  return (
    <Providers session={session}>
      {" "}
      {/* 🚨 Hydrating the Client Context with SSR data */}
      <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
        <Sidebar
          orgName={dbUser.organization?.name}
          userName={dbUser.name || "User"}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto pb-10">{children}</main>
          <FloatingWidget />
        </div>
      </div>
    </Providers>
  );
}
