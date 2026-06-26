// Server-only helpers for the visit-scheduling API routes. Centralizes the
// "signed in, account exists, not blocked" gate and party resolution so every
// route enforces the same rules. Do NOT import this from client components.

import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { VisitParty } from "@/lib/visits";

type ActiveUserOk = { user: User };
type ActiveUserErr = { error: NextResponse };

/**
 * Resolves the signed-in user for a mutating request. Returns `{ error }` (a
 * ready-to-return JSON response) when the caller is signed out, missing, or
 * blocked; otherwise `{ user }` with the fresh database row.
 */
export async function requireActiveUser(): Promise<ActiveUserOk | ActiveUserErr> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  const user = await prisma.user
    .findUnique({ where: { id: session.user.id } })
    .catch(() => null);
  if (!user) {
    return { error: NextResponse.json({ error: "Account not found." }, { status: 401 }) };
  }
  if (user.blocked) {
    return {
      error: NextResponse.json(
        { error: "Your account is restricted to viewing only." },
        { status: 403 },
      ),
    };
  }
  return { user };
}

/** Which side of a visit a user is, or null if they are neither party. */
export function partyFor(
  visit: { patientId: string; doctorId: string },
  userId: string,
): VisitParty | null {
  if (visit.patientId === userId) return "PATIENT";
  if (visit.doctorId === userId) return "DOCTOR";
  return null;
}
