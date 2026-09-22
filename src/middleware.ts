import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/levels/:path*",
    "/lessons/:path*",
    "/practice/:path*",
    "/tests/:path*",
    "/results/:path*",
    "/admin/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/placement/:path*",
    "/login",
    "/register",
  ],
};
