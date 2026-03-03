import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET, // 🚨 CRITICAL: Explicitly set this for Vercel
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        console.log("Login attempt for:", credentials?.email);
        if (!credentials?.email) return null;

        // ==========================================
        // 1. Handle OTP Login & Registration Flow
        // ==========================================
        if (credentials.otp) {
          const validOtp = await prisma.otpCode.findFirst({
            where: {
              email: credentials.email,
              otp: credentials.otp,
              expiresAt: { gt: new Date() }, // Ensure it hasn't expired
            },
          });

          if (!validOtp) {
            console.error("Invalid or expired OTP");
            return null;
          }

          // Delete OTP after successful use to prevent replay attacks
          await prisma.otpCode.delete({ where: { id: validOtp.id } });

          // 🚨 NEW LOGIC: Securely hash the password if it was provided during OTP creation
          let hashedPassword = undefined;
          if (credentials.password) {
            hashedPassword = await bcrypt.hash(credentials.password, 10);
          }

          // Upsert the user and save the hashed password if they are new
          const user = await prisma.user.upsert({
            where: { email: credentials.email },
            update: {
              // Optional: If they somehow already exist without a name, this adds it
              ...(credentials.name && { name: credentials.name }),
            },
            create: {
              email: credentials.email,
              name: credentials.name,
              // Only attach the password field if a password was provided
              ...(hashedPassword && { password: hashedPassword }),
            },
          });

          return user;
        }

        // ==========================================
        // 2. Handle Standard Password Login Flow
        // ==========================================
        if (credentials.password) {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            console.error("User not found or missing password");
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password,
          );

          if (!isPasswordValid) {
            console.error("Invalid password");
            return null;
          }

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
