import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge middleware: uses only the edge-safe config (no Prisma). Exporting the
// `auth` handler directly makes NextAuth apply the `authorized` callback to
// every matched route and redirect unauthenticated users to the sign-in page.
export default NextAuth(authConfig).auth;

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
