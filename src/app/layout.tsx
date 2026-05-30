import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { auth, signOut } from "@/auth";

export const metadata: Metadata = {
  title: "SciPlan — Plan your research, step by step",
  description:
    "An interactive guide for students to plan research: question, design, definitions, sample size, resources, and statistical methods — with a final AI review and calculators.",
};

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/signin" });
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-sm text-white">
                Sci
              </span>
              SciPlan
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {user ? (
                <>
                  <Link href="/" className="text-slate-600 hover:text-brand-700">
                    My plans
                  </Link>
                  {!user.blocked && (
                    <Link
                      href="/plan"
                      className="text-slate-600 hover:text-brand-700"
                    >
                      New plan
                    </Link>
                  )}
                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      className="font-medium text-brand-700 hover:text-brand-800"
                    >
                      Admin
                    </Link>
                  )}
                  <span className="hidden text-slate-400 sm:inline">
                    {user.email}
                  </span>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/signin"
                  className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-400">
          SciPlan helps you plan a study. It is an educational aid, not a
          substitute for a supervisor, statistician, or ethics board.
        </footer>
      </body>
    </html>
  );
}
