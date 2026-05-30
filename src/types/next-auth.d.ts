import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "USER" | "ADMIN";
    blocked?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      blocked: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "USER" | "ADMIN";
    blocked?: boolean;
  }
}
