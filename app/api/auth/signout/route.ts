import { NextResponse } from "next/server";

// We MUST export a POST function to handle NextAuth's default behavior
export async function POST(request: Request) {
  // 1. Create the response that redirects the user to the login page
  const response = NextResponse.redirect(new URL("/", request.url));

  // 2. Determine the correct cookie name based on the environment
  // Production uses secure cookies, local dev does not
  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

  // 3. Delete the session cookie to destroy the session
  response.cookies.delete(cookieName);

  return response;
}

// Optional: You can also export a GET function if you want to allow
// users to log out by navigating to /api/signout directly in the browser
export async function GET(request: Request) {
  return POST(request);
}
