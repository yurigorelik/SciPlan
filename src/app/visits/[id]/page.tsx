import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import VisitDetail, {
  type VisitView,
  type SlotView,
} from "@/components/VisitDetail";
import type { VisitParty } from "@/lib/visits";

export const dynamic = "force-dynamic";

function NotAvailable() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Visit not available</h1>
      <p className="mt-2 text-sm text-slate-600">
        This visit doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/visits"
        className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Back to visits
      </Link>
    </div>
  );
}

export default async function VisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user; // middleware guarantees sign-in

  let visit;
  try {
    visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: {
          select: { id: true, name: true, email: true, specialty: true },
        },
        scheduledSlot: true,
        customSlots: { orderBy: { start: "asc" } },
      },
    });
  } catch {
    return <NotAvailable />;
  }

  if (!visit) return <NotAvailable />;

  const isAdmin = user.role === "ADMIN";
  const viewerParty: VisitParty | null =
    visit.patientId === user.id
      ? "PATIENT"
      : visit.doctorId === user.id
        ? "DOCTOR"
        : null;

  if (!viewerParty && !isAdmin) return <NotAvailable />;

  // Candidate open slots the patient can book (only meaningful once ACCEPTED).
  let candidateSlots: SlotView[] = [];
  if (visit.status === "ACCEPTED" && visit.slotSource) {
    try {
      const rows =
        visit.slotSource === "CUSTOM"
          ? await prisma.slot.findMany({
              where: { visitId: visit.id, booked: false, start: { gt: new Date() } },
              orderBy: { start: "asc" },
            })
          : await prisma.slot.findMany({
              where: {
                doctorId: visit.doctorId,
                visitId: null,
                booked: false,
                start: { gt: new Date() },
              },
              orderBy: { start: "asc" },
            });
      candidateSlots = rows.map((s) => ({
        id: s.id,
        start: s.start.toISOString(),
        end: s.end.toISOString(),
      }));
    } catch {
      candidateSlots = [];
    }
  }

  const view: VisitView = {
    id: visit.id,
    status: visit.status,
    requestedBy: visit.requestedBy,
    reason: visit.reason,
    modality: visit.modality,
    meetingLink: visit.meetingLink,
    location: visit.location,
    costCents: visit.costCents,
    currency: visit.currency,
    terms: visit.terms,
    slotSource: visit.slotSource,
    scheduledStart: visit.scheduledStart ? visit.scheduledStart.toISOString() : null,
    scheduledEnd: visit.scheduledEnd ? visit.scheduledEnd.toISOString() : null,
    termsAcceptedAt: visit.termsAcceptedAt ? visit.termsAcceptedAt.toISOString() : null,
    cancelledBy: visit.cancelledBy,
    createdAt: visit.createdAt.toISOString(),
    patient: visit.patient,
    doctor: visit.doctor,
  };

  // Admins view read-only; a blocked party can view but not act.
  const readOnly = !viewerParty || user.blocked;

  return (
    <VisitDetail
      visit={view}
      candidateSlots={candidateSlots}
      viewerParty={viewerParty}
      readOnly={readOnly}
    />
  );
}
