import { auth } from "@/auth";

/**
 * Returns the current session if the user is an admin, otherwise null.
 * Use in admin-only API routes and pages.
 */
export async function getAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}
