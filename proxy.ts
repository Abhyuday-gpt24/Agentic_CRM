// proxy.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 1. The exported function must now be named 'proxy' (or be a default export)
export default async function proxy(req: NextRequest) {
  // Grab the NextAuth token from the user's cookies
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 2. If they ARE logged in, and try to visit the login page ("/"), route them to frontend
  if (token && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 3. If they are NOT logged in, and try to visit the CRM ("/dashboard"), route them to login
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Otherwise, let them proceed normally
  return NextResponse.next();
}

// 4. The config object remains exactly the same
export const config = {
  /*
   * Match all request paths except:
   * 1. /api/auth (Let NextAuth handle its own routes)
   * 2. /_next (Static files)
   * 3. /fonts, /images, etc. (Static assets)
   */
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
