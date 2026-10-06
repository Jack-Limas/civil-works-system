import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

type Locale = (typeof routing.locales)[number];

export default function proxy(request: NextRequest) {
  const response = intlMiddleware(request);

  const segments = request.nextUrl.pathname.split("/");
  const possibleLocale = segments[1] as Locale;
  const locale = routing.locales.includes(possibleLocale)
    ? possibleLocale
    : routing.defaultLocale;
  const pathWithoutLocale = "/" + segments.slice(2).join("/");

  const hasSession = request.cookies.has("accessToken");
  const isAuthRoute =
    pathWithoutLocale.startsWith("/login") ||
    pathWithoutLocale.startsWith("/register");
  const isPrivateRoute =
    pathWithoutLocale.startsWith("/dashboard") ||
    pathWithoutLocale.startsWith("/projects");

  if (isPrivateRoute && !hasSession) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};