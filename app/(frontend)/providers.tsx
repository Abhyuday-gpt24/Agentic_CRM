"use client";

import { SessionProvider } from "next-auth/react";
import { SidebarProvider } from "./context/sidebar_context";
import { Session } from "next-auth"; // 🚨 Import the official type

interface ProvidersProps {
  children: React.ReactNode;
  session: Session | null; // 🚨 Replace 'any' with the proper type
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <SidebarProvider>{children}</SidebarProvider>
    </SessionProvider>
  );
}
