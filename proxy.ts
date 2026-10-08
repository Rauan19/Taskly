import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

const PUBLIC_ONLY = ["/login", "/register"]; // visitantes apenas
const PRIVATE_PREFIXES = ["/dashboard", "/projects", "/tasks", "/my-tasks", "/profile", "/invitations"];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const userId = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!userId && PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // `?expired=1`: cookie válido mas usuário não existe mais — deixa abrir /login para evitar loop.
  if (userId && PUBLIC_ONLY.includes(pathname) && !req.nextUrl.searchParams.has("expired")) {
    const next = req.nextUrl.searchParams.get("next");
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
