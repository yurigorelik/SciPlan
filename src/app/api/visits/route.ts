import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visit-access";

export const runtime = "nodejs";

// Create a visit request. Either side may initiate:
//   - asRole "patient": the signed-in user requests a visit with a doctor.
//   - asRole "doctor":  a doctor requests a visit with a patient (by email).
// In both cases the visit starts in REQUESTED; the doctor accepts it (setting
// the cost, modality, and slots) before the patient can book.
export async function POST(req: NextRequest) {
  const actor = await requireActiveUser();
  if ("error" in actor) return actor.error;
  const me = actor.user;

  let body: {
    asRole?: string;
    doctorId?: string;
    patientEmail?: string;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const reason = (body.reason ?? "").trim().slice(0, 2000) || null;

  if (body.asRole === "patient") {
    const doctorId = (body.doctorId ?? "").trim();
    if (!doctorId) {
      return NextResponse.json({ error: "Choose a doctor." }, { status: 400 });
    }
    if (doctorId === me.id) {
      return NextResponse.json(
        { error: "You cannot request a visit with yourself." },
        { status: 400 },
      );
    }
    const doctor = await prisma.user
      .findUnique({ where: { id: doctorId } })
      .catch(() => null);
    if (!doctor || !doctor.isDoctor) {
      return NextResponse.json(
        { error: "That doctor is not available." },
        { status: 404 },
      );
    }
    const visit = await prisma.visit.create({
      data: {
        patientId: me.id,
        doctorId: doctor.id,
        requestedBy: "PATIENT",
        status: "REQUESTED",
        reason,
      },
    });
    return NextResponse.json({ id: visit.id }, { status: 201 });
  }

  if (body.asRole === "doctor") {
    if (!me.isDoctor) {
      return NextResponse.json(
        { error: "Enable doctor mode before requesting a visit as a doctor." },
        { status: 403 },
      );
    }
    const email = (body.patientEmail ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "Enter the patient's email." },
        { status: 400 },
      );
    }
    const patient = await prisma.user
      .findUnique({ where: { email } })
      .catch(() => null);
    if (!patient || patient.blocked) {
      return NextResponse.json(
        { error: "No active account was found with that email." },
        { status: 404 },
      );
    }
    if (patient.id === me.id) {
      return NextResponse.json(
        { error: "You cannot request a visit with yourself." },
        { status: 400 },
      );
    }
    const visit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        doctorId: me.id,
        requestedBy: "DOCTOR",
        status: "REQUESTED",
        reason,
      },
    });
    return NextResponse.json({ id: visit.id }, { status: 201 });
  }

  return NextResponse.json(
    { error: "Specify whether you are requesting as a patient or a doctor." },
    { status: 400 },
  );
}
