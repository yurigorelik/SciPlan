import Link from "next/link";
import { STEPS } from "@/lib/steps";

export default function Home() {
  return (
    <div>
      <section className="mb-12 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Plan your research, one step at a time.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            SciPlan walks students through designing a sound study — from the
            research question to the statistical analysis plan — with AI guidance
            and built-in calculators at each step.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/plan"
              className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
            >
              Start a plan
            </Link>
            <a
              href="#how"
              className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-white"
            >
              How it works
            </a>
          </div>
        </div>

        <div className="flex w-full max-w-xs shrink-0 flex-col items-center rounded-xl border border-slate-200 bg-white p-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/qr-sciplan.svg"
            alt="QR code linking to the SciPlan website"
            className="h-40 w-40"
            width={160}
            height={160}
          />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Scan to open on your phone
          </p>
          <a
            href="https://sciplan-production.up.railway.app/"
            className="mt-1 break-all text-xs text-brand-700 hover:underline"
          >
            sciplan-production.up.railway.app
          </a>
        </div>
      </section>

      <section id="how">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          The six steps
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                  {i + 1}
                </span>
                <h3 className="font-semibold text-slate-900">{step.title}</h3>
              </div>
              <p className="text-sm text-slate-600">{step.blurb}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
