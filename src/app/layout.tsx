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
  const initial =
    (user?.name?.[0] || user?.email?.[0] || "?").toUpperCase();

  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm text-white shadow-sm">
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
                  <span className="hidden items-center gap-2 sm:flex">
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt=""
                        className="h-7 w-7 rounded-full border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                        {initial}
                      </span>
                    )}
                    <span className="max-w-[14rem] truncate text-slate-400">
                      {user.email}
                    </span>
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
        <footer className="border-t border-slate-200">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs text-slate-400">
              SciPlan helps you plan a study. It is an educational aid, not a
              substitute for a supervisor, statistician, or ethics board.
            </p>
            <a
              href="/"
              className="flex shrink-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-2"
              title="Open the SciPlan homepage"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/qr-sciplan.svg"
                alt="QR code linking to the SciPlan homepage"
                className="h-16 w-16"
                width={64}
                height={64}
              />
              <span className="pr-2 text-xs leading-tight text-slate-500">
                Scan to open
                <br />
                <span className="font-medium text-brand-700">SciPlan</span>
              </span>
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
