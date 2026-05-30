// Admin bootstrapping helpers.
//
// Two ways to become an admin:
//   1. Your email is in ADMIN_EMAILS (defaults to the project owner).
//   2. You sign in with the seeded credentials admin account.

// Emails that are always granted the ADMIN role on sign-in.
export const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS || "yurigorelik@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// The seeded credentials admin. Username + password can be overridden via env.
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "SciPlan2026!";
// A synthetic email used to store the credentials admin as a User row.
export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "admin@sciplan.local";
