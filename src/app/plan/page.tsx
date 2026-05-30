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
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-amber-900">
          New plans are disabled for your account
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Your account is restricted to viewing plans you already created.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Back to my plans
        </Link>
      </div>
    );
  }

  return <Wizard />;
}
