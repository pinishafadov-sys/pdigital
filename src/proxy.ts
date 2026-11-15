import { NextResponse, type NextRequest } from "next/server";

const isDev = process.env.NODE_ENV !== "production";

// When ADMIN_HOST is set (e.g. "admin.example.co.il"), the admin panel is only
// reachable on that sub-domain, and /admin on the public site returns 404.
const ADMIN_HOST = process.env.ADMIN_HOST?.toLowerCase();

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com",
    "frame-src 'self' https://www.googletagmanager.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const url = request.nextUrl.clone();
  const isAdminHost = ADMIN_HOST ? host === ADMIN_HOST : host.startsWith("admin.");

  if (ADMIN_HOST && !isAdminHost && url.pathname.startsWith("/admin")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response: NextResponse;
  if (isAdminHost && !url.pathname.startsWith("/admin")) {
    url.pathname = `/admin${url.pathname === "/" ? "" : url.pathname}`;
    response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  response.headers.set("Content-Security-Policy", csp);
  if (url.pathname.startsWith("/admin") || isAdminHost) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store");
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|uploads/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
