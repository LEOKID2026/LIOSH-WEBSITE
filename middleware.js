import { NextResponse } from "next/server";
import { mapLegacyPathToScopedPath } from "./lib/pwa/pwa-scope-routes.js";

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const scoped = mapLegacyPathToScopedPath(pathname, searchParamsFromUrl(search));
  if (!scoped || scoped === pathname) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = scoped;
  return NextResponse.redirect(url, 308);
}

/** @param {string} search */
function searchParamsFromUrl(search) {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

export const config = {
  matcher: [
    "/games",
    "/game",
    "/gallery",
    "/offline",
    "/offline/:path*",
    "/learning",
    "/learning/:path*",
    "/guardian/:path*",
  ],
};
