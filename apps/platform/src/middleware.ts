import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("mocci_session");
  const { pathname } = req.nextUrl;

  if (!hasSession && (pathname.startsWith("/dashboard") || pathname.startsWith("/editor"))) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/editor/:path*"],
};
