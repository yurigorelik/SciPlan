import type { NextAuthConfig } from "next-auth";
import { isAdminEmail } from "@/lib/admin";

// Edge-safe Auth.js configuration shared between the middleware and the full
// server config. It must NOT import Prisma or any Node-only modules, because
// the middleware runs on the edge runtime.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  // Providers are added in the Node-only `auth.ts`. The middleware only needs
  // to verify the JWT, which requires no providers.
  providers: [],
  callbacks: {
    // Gate the whole site behind sign-in. Public paths are allowed through.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/signin" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname === "/favicon.ico" ||
        pathname === "/qr-sciplan.svg";
      if (isPublic) return true;
      return !!auth?.user;
    },
    // Persist identity, role, and blocked state into the JWT. Admin role is
    // derived from the email (a pure, edge-safe check) so it works without a
    // database round-trip in the middleware.
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "USER";
        token.blocked = (user as { blocked?: boolean }).blocked ?? false;
        if (user.email) token.email = user.email;
      }
      if (isAdminEmail(token.email as string | undefined)) {
        token.role = "ADMIN";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) ?? session.user.id;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
        session.user.blocked = (token.blocked as boolean) ?? false;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
