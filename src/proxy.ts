import { NextResponse, type NextRequest } from "next/server";

/**
 * Single-user mode — no authentication required.
 * Just redirect root → dashboard and pass everything else through.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Root → dashboard
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Login/signup pages → redirect to dashboard (no auth needed)
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
