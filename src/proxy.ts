import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optional lightweight gate for a public deployment (e.g. Vercel), where the
// app would otherwise be reachable by anyone with the URL. This is NOT real
// authentication — it's a shared-secret speed bump for a single-user
// personal app, per README/.env.example. Leaving APP_SHARED_SECRET unset
// keeps the app fully open, matching the "no auth needed" spec.
//
// Note: Next.js 16 renamed `middleware.ts` to `proxy.ts` (same file
// convention, `proxy` export instead of `middleware`) — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
const COOKIE_NAME = "hifz_auth";
const PUBLIC_PATHS = ["/api/health"];

export function proxy(request: NextRequest) {
  const secret = process.env.APP_SHARED_SECRET;
  if (!secret) return NextResponse.next();

  const { pathname, searchParams } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (request.cookies.get(COOKIE_NAME)?.value === secret) {
    return NextResponse.next();
  }

  const keyParam = searchParams.get("key");
  if (keyParam === secret) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("key");
    const response = NextResponse.redirect(url);
    response.cookies.set(COOKIE_NAME, secret, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  return new NextResponse("Unauthorized. Append ?key=<APP_SHARED_SECRET> to the URL once.", {
    status: 401,
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
