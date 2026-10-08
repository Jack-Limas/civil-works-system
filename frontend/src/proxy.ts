import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

type Locale = (typeof routing.locales)[number];

/** Routes reachable without a session. Everything else is private by default. */
const PUBLIC_PATHS = ["/", "/login", "/register"];
/** Public routes that make no sense once logged in. */
const AUTH_PATHS = ["/login", "/register"];

function matches(path: string, candidates: string[]) {
  return candidates.some((c) => (c === "/" ? path === "/" : path === c || path.startsWith(`${c}/`)));
}

export default function proxy(request: NextRequest) {
  const response = intlMiddleware(request);

  const segments = request.nextUrl.pathname.split("/");
  const possibleLocale = segments[1] as Locale;
  const hasLocalePrefix = routing.locales.includes(possibleLocale);
  const locale = hasLocalePrefix ? possibleLocale : routing.defaultLocale;
  const pathWithoutLocale = "/" + segments.slice(hasLocalePrefix ? 2 : 1).filter(Boolean).join("/");

  const hasSession = request.cookies.has("accessToken");

  if (!matches(pathWithoutLocale, PUBLIC_PATHS) && !hasSession) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // The cookie only proves a session existed, not that it is still valid. When the
  // client reports an expired session, show the login instead of bouncing back.
  const sessionExpired = request.nextUrl.searchParams.get("session") === "expired";

  if (matches(pathWithoutLocale, AUTH_PATHS) && hasSession && !sessionExpired) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  // No escaped characters on purpose: the build dropped the backslash of the
  // usual ".*\..*" file-extension exclusion, turning it into ".*..*", which
  // excluded every path longer than one character and silently disabled the
  // proxy. Static assets live under /_next and /workers, so prefixes suffice.
  matcher: ["/((?!api|_next|_vercel|workers|favicon).*)"],
};
