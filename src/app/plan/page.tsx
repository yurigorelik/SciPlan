import Link from "next/link";
import Wizard from "@/components/Wizard";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  const session = await auth();
  const user = session!.user; // middleware guarantees sign-in

  // Blocked users cannot start new plans.
  if (user.blocked) {
    return (
      <div className="border border-amber-300 bg-amber-50 p-10 text-center">
        <h1 className="font-display text-xl font-semibold text-amber-900">
          New plans are disabled for your account
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Your account is restricted to viewing plans you already created.
        </p>
        <Link href="/" className="btn btn-primary mt-5">
          Back to my plans
        </Link>
      </div>
    );
  }

  return <Wizard />;
}
