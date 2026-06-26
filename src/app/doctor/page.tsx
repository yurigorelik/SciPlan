import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import DoctorAvailability, {
  type StandingSlot,
} from "@/components/DoctorAvailability";

export const dynamic = "force-dynamic";

export default async function DoctorPage() {
  const session = await auth();
  const user = session!.user; // middleware guarantees sign-in

  if (user.blocked) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-amber-900">
          Doctor mode is disabled for your account
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Your account is restricted to viewing only.
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

  let profile = { isDoctor: false, specialty: "", bio: "" };
  let slots: StandingSlot[] = [];
  try {
    const [dbUser, slotRows] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { isDoctor: true, specialty: true, bio: true },
      }),
      prisma.slot.findMany({
        where: { doctorId: user.id, visitId: null },
        orderBy: { start: "asc" },
      }),
    ]);
    profile = {
      isDoctor: !!dbUser?.isDoctor,
      specialty: dbUser?.specialty ?? "",
      bio: dbUser?.bio ?? "",
    };
    slots = slotRows.map((s) => ({
      id: s.id,
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      booked: s.booked,
    }));
  } catch {
    // Database not configured.
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/visits" className="text-sm text-slate-500 hover:text-brand-700">
        ← Back to visits
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Doctor settings</h1>
      <p className="mt-1 text-sm text-slate-600">
        Enable doctor mode, describe your practice, and set the times you&apos;re
        available so patients can book.
      </p>
      <div className="mt-6">
        <DoctorAvailability initialProfile={profile} initialSlots={slots} />
      </div>
    </div>
  );
}
