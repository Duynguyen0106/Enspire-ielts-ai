import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      const protectedPrefixes = [
        "/dashboard",
        "/levels",
        "/lessons",
        "/practice",
        "/tests",
        "/results",
        "/admin",
        "/settings",
        "/onboarding",
        "/placement",
      ];

      const isProtected = protectedPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      );

      if (isProtected) {
        return isLoggedIn;
      }

      if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
