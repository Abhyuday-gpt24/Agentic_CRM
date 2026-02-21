/*  #################### REQUIRED
// types/next-auth.d.ts

import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      // Add the user's database ID to the session object safely
      id: string;
    } & DefaultSession["user"];
  }
}
*/

import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  // Extends the built-in User model
  interface User {
    organizationId?: string | null;
    role?: Role;
  }

  // If you also need it on the session object
  interface Session {
    user: {
      id: string;
      organizationId?: string | null;
      role?: Role;
    } & DefaultSession["user"];
  }
}
