import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SciPlan — Plan your research, step by step",
  description:
    "An interactive guide for students to plan research: question, design, definitions, sample size, resources, and statistical methods — with AI guidance and calculators.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
              <Link href="/plan" className="text-slate-600 hover:text-brand-700">
                New plan
              </Link>
              <a
                href="https://github.com/yurigorelik/sciplan"
                className="text-slate-600 hover:text-brand-700"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
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
