import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED = [
  "/dashboard",
  "/creators",
  "/inbox",
  "/integrations",
  "/deals",
  "/events",
  "/salary",
  "/reviews",
  "/settings",
];
const AUTH_PAGES = ["/login", "/signup", "/register"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED.some((route) => pathname.startsWith(route));
  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isAuthPage = AUTH_PAGES.some((route) => pathname.startsWith(route));
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/creators/:path*",
    "/inbox/:path*",
    "/integrations/:path*",
    "/deals/:path*",
    "/events/:path*",
    "/salary/:path*",
    "/reviews/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
    "/register",
  ],
};
