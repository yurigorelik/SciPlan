import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  STATUS_BADGE,
  STATUS_LABELS,
  MODALITY_LABELS,
  formatMoney,
  formatSlotRange,
  type VisitStatus,
  type VisitModality,
} from "@/lib/visits";

export const dynamic = "force-dynamic";

type VisitRow = {
  id: string;
  status: VisitStatus;
  requestedBy: "PATIENT" | "DOCTOR";
  modality: VisitModality | null;
  costCents: number | null;
  currency: string;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  patientId: string;
  doctorId: string;
  patient: { name: string | null; email: string | null };
  doctor: { name: string | null; email: string | null; specialty: string | null };
};

function who(u: { name: string | null; email: string | null }): string {
  return u.name || u.email || "Unknown";
}

function VisitCard({ visit, asDoctor }: { visit: VisitRow; asDoctor: boolean }) {
  const counterpart = asDoctor ? visit.patient : visit.doctor;
  const needsYou =
    (asDoctor && visit.status === "REQUESTED") ||
    (!asDoctor && visit.status === "ACCEPTED");
  return (
    <Link
      href={`/visits/${visit.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">
            {asDoctor ? "Patient: " : "Dr. "}
            {who(counterpart)}
          </p>
          {!asDoctor && visit.doctor.specialty && (
            <p className="truncate text-xs text-slate-400">
              {visit.doctor.specialty}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[visit.status]}`}
        >
          {STATUS_LABELS[visit.status]}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        {visit.modality && <span>{MODALITY_LABELS[visit.modality]}</span>}
        {visit.costCents != null && (
          <span>{formatMoney(visit.costCents, visit.currency)}</span>
        )}
        {visit.status === "BOOKED" && visit.scheduledStart && visit.scheduledEnd && (
          <span className="font-medium text-emerald-700">
            {formatSlotRange(visit.scheduledStart, visit.scheduledEnd)}
          </span>
        )}
        {needsYou && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
            Needs your action
          </span>
        )}
      </div>
    </Link>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export default async function VisitsPage() {
  const session = await auth();
  const user = session!.user; // middleware guarantees sign-in

  let isDoctor = false;
  let visits: VisitRow[] = [];
  try {
    const [dbUser, rows] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { isDoctor: true },
      }),
      prisma.visit.findMany({
        where: { OR: [{ patientId: user.id }, { doctorId: user.id }] },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          status: true,
          requestedBy: true,
          modality: true,
          costCents: true,
          currency: true,
          scheduledStart: true,
          scheduledEnd: true,
          patientId: true,
          doctorId: true,
          patient: { select: { name: true, email: true } },
          doctor: { select: { name: true, email: true, specialty: true } },
        },
      }),
    ]);
    isDoctor = !!dbUser?.isDoctor;
    visits = rows as VisitRow[];
  } catch {
    // Database not configured — show empty lists.
  }

  const asPatient = visits.filter((v) => v.patientId === user.id);
  const asDoctor = visits.filter((v) => v.doctorId === user.id);

  return (
    <div>
      <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Appointments
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Doctor visits
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Request a visit, agree on a time and cost, and meet in person or by
            video. Either side can start the conversation.
          </p>
        </div>
        {!user.blocked && (
          <Link
            href="/visits/new"
            className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-brand-700"
          >
            + Request a visit
          </Link>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            As a patient
          </h2>
        </div>
        {asPatient.length === 0 ? (
          <EmptyState>
            You have no visits yet.{" "}
            {!user.blocked && (
              <Link href="/visits/new" className="font-medium text-brand-700 hover:underline">
                Request your first visit →
              </Link>
            )}
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {asPatient.map((v) => (
              <li key={v.id}>
                <VisitCard visit={v} asDoctor={false} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {isDoctor ? (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              As a doctor
            </h2>
            <Link
              href="/doctor"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Manage availability →
            </Link>
          </div>
          {asDoctor.length === 0 ? (
            <EmptyState>
              No one has requested a visit with you yet, and you haven&apos;t
              reached out to a patient.
            </EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {asDoctor.map((v) => (
                <li key={v.id}>
                  <VisitCard visit={v} asDoctor={true} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        !user.blocked && (
          <section className="rounded-xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white p-5">
            <h2 className="font-semibold text-slate-900">Are you a doctor?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Turn on doctor mode to set your availability and accept visit
              requests from patients.
            </p>
            <Link
              href="/doctor"
              className="mt-3 inline-block rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:border-brand-400"
            >
              Set up doctor mode →
            </Link>
          </section>
        )
      )}
    </div>
  );
}
