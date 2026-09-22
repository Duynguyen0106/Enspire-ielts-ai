import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/levels",
    "/levels/:path*",
    "/lessons",
    "/lessons/:path*",
    "/practice",
    "/practice/:path*",
    "/tests",
    "/tests/:path*",
    "/results",
    "/results/:path*",
    "/admin",
    "/admin/:path*",
    "/settings",
    "/settings/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/placement",
    "/placement/:path*",
    "/login",
    "/register",
  ],
};
