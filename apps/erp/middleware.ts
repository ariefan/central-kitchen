import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the session cookie - handle both secure and non-secure cookie names
  // In production (HTTPS), Better Auth uses __Secure- prefix
  // In development (HTTP), it uses the plain name
  const sessionToken =
    request.cookies.get("__Secure-better-auth.session_token") ||
    request.cookies.get("better-auth.session_token");
  const hasSession = !!sessionToken;

  // Public routes that don't require authentication
  const publicRoutes = ["/auth"];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Root path handling
  if (pathname === "/") {
    // Redirect to welcome if authenticated, auth if not
    const redirectUrl = hasSession ? "/welcome" : "/auth";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Redirect to auth if trying to access protected route without session
  if (!isPublicRoute && !hasSession) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // Redirect to welcome if trying to access auth with active session
  if (isPublicRoute && hasSession) {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static files: images, fonts, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|svg|gif|webp|ico|woff|woff2|ttf|eot)).*)",
  ],
};
