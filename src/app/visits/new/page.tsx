import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import NewVisitForm, { type DoctorOption } from "@/components/NewVisitForm";

export const dynamic = "force-dynamic";

export default async function NewVisitPage() {
  const session = await auth();
  const user = session!.user; // middleware guarantees sign-in

  if (user.blocked) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-amber-900">
          Requesting visits is disabled for your account
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

  let isDoctor = false;
  let doctors: DoctorOption[] = [];
  try {
    const [dbUser, docs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { isDoctor: true },
      }),
      prisma.user.findMany({
        where: { isDoctor: true, blocked: false, NOT: { id: user.id } },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        select: { id: true, name: true, email: true, specialty: true },
      }),
    ]);
    isDoctor = !!dbUser?.isDoctor;
    doctors = docs.map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      specialty: d.specialty,
    }));
  } catch {
    // Database not configured.
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/visits" className="text-sm text-slate-500 hover:text-brand-700">
        ← Back to visits
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Request a visit</h1>
      <p className="mt-1 text-sm text-slate-600">
        Start a request. The doctor reviews it, then proposes times and a cost
        for you to confirm.
      </p>
      <div className="mt-6">
        <NewVisitForm isDoctor={isDoctor} doctors={doctors} />
      </div>
    </div>
  );
}
