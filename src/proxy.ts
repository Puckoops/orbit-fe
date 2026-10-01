import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "orbit_session";
const PATH_HEADER = "x-orbit-path";
const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/verify"]);

/** Optimistic check only: the session is verified where data is read. */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE);

  if (PUBLIC_PATHS.has(pathname)) {
    if (signedIn && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!signedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, pathname + search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)"],
};
