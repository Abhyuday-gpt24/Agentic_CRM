import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // 1. Handle OTP Login Flow
        if (credentials.otp) {
          const validOtp = await prisma.otpCode.findFirst({
            where: {
              email: credentials.email,
              otp: credentials.otp,
              expiresAt: { gt: new Date() }, // Ensure it hasn't expired
            },
          });

          if (!validOtp) return null;

          // Delete OTP after successful use to prevent replay attacks
          await prisma.otpCode.delete({ where: { id: validOtp.id } });

          // Find and return the user
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          return user;
        }

        // 2. Handle Standard Password Login Flow
        if (credentials.password) {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          if (!user || !user.password) return null;

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password,
          );
          if (!isPasswordValid) return null;

          return user;
        }

        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
