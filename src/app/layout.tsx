import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { auth, signOut } from "@/auth";

export const metadata: Metadata = {
  title: "SciPlan — Plan your research, step by step",
  description:
    "An interactive guide for students to plan research: question, design, definitions, sample size, resources, and statistical methods — with a final AI review, a generated protocol, and built-in calculators.",
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
  const initial = (user?.name?.[0] || user?.email?.[0] || "?").toUpperCase();

  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-40 border-b-2 border-brand-700 bg-[#f7f6f1]/95 backdrop-blur print-hide">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo />
              <span className="leading-none">
                <span className="block font-display text-lg font-semibold tracking-tight text-slate-900">
                  SciPlan
                </span>
                <span className="hidden font-mono text-[9px] uppercase tracking-label text-slate-500 sm:block">
                  Research protocol planner
                </span>
              </span>
            </Link>

            <nav className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-label">
              {user ? (
                <>
                  <NavLink href="/">My plans</NavLink>
                  {!user.blocked && <NavLink href="/plan">New plan</NavLink>}
                  {user.role === "ADMIN" && <NavLink href="/admin">Admin</NavLink>}
                  <span className="mx-2 hidden items-center gap-2 sm:flex">
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt=""
                        className="h-6 w-6 rounded-sm border border-slate-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="grid h-6 w-6 place-items-center rounded-sm border border-slate-300 bg-white text-[10px] font-semibold text-slate-600">
                        {initial}
                      </span>
                    )}
                    <span className="max-w-[12rem] truncate normal-case tracking-normal text-slate-400">
                      {user.email}
                    </span>
                  </span>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="border border-slate-300 bg-white px-2.5 py-1.5 uppercase tracking-label text-slate-600 transition hover:border-brand-700 hover:text-brand-800"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/signin"
                  className="border border-brand-700 bg-brand-700 px-3 py-1.5 uppercase tracking-label text-white transition hover:bg-brand-900"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>

        <footer className="mt-8 border-t border-slate-300 print-hide">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-relaxed text-slate-500">
              <span className="font-mono uppercase tracking-label text-slate-600">
                Note —{" "}
              </span>
              SciPlan helps you plan a study. It is an educational aid, not a
              substitute for a supervisor, statistician, or ethics board.
            </p>
            <a
              href="/"
              className="flex shrink-0 items-center gap-3 border border-slate-300 bg-white p-2"
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
              <span className="pr-2 font-mono text-[10px] uppercase leading-relaxed tracking-label text-slate-500">
                Scan to
                <br />
                open
                <br />
                <span className="text-slate-900">SciPlan</span>
              </span>
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="border-b-2 border-transparent px-2.5 py-1.5 text-slate-600 transition hover:border-citron-400 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}

function Logo() {
  return (
    <span className="relative grid h-8 w-8 shrink-0 place-items-center bg-brand-700 font-display text-base font-semibold text-white">
      S
      <span
        aria-hidden
        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-citron-300"
      />
    </span>
  );
}
