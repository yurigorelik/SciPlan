import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  isAdminEmail,
} from "@/lib/admin";

// Build the provider list. OAuth providers are only enabled when their client
// credentials are configured, so the site stays usable (via the credentials
// admin) before Google/Microsoft are set up.
const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.AUTH_MICROSOFT_ID && process.env.AUTH_MICROSOFT_SECRET) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ID,
      clientSecret: process.env.AUTH_MICROSOFT_SECRET,
      issuer: process.env.AUTH_MICROSOFT_TENANT
        ? `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_TENANT}/v2.0`
        : undefined,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// The seeded credentials admin (username + password). Always available so the
// site can be administered without OAuth configured.
providers.push(
  Credentials({
    name: "Administrator",
    credentials: {
      username: { label: "Username", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(creds) {
      const username = String(creds?.username ?? "");
      const password = String(creds?.password ?? "");
      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return null;
      }
      // Ensure the admin User row exists, then return it.
      const user = await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: { role: "ADMIN", blocked: false },
        create: {
          email: ADMIN_EMAIL,
          name: "Administrator",
          role: "ADMIN",
        },
      });
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        blocked: user.blocked,
      };
    },
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Trust the deployment host (e.g. Railway) for callback URL detection.
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers,
  events: {
    // Keep the database role in sync for known admin emails on every sign-in.
    async signIn({ user }) {
      if (user.email && isAdminEmail(user.email)) {
        await prisma.user
          .update({ where: { email: user.email }, data: { role: "ADMIN" } })
          .catch(() => {});
      }
    },
  },
});

// Whether any OAuth provider is configured (used to show/hide buttons).
export const oauthEnabled = {
  google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  microsoft: !!(
    process.env.AUTH_MICROSOFT_ID && process.env.AUTH_MICROSOFT_SECRET
  ),
};
