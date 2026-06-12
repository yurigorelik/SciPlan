import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, oauthEnabled } from "@/auth";

export const dynamic = "force-dynamic";

async function googleSignIn() {
  "use server";
  await signIn("google", { redirectTo: "/plan" });
}

async function microsoftSignIn() {
  "use server";
  await signIn("microsoft-entra-id", { redirectTo: "/plan" });
}

async function credentialsSignIn(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/plan",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/signin?error=1");
    }
    throw error;
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/plan");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
        <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white shadow-sm">
          Sci
        </span>
        <h1 className="text-2xl font-bold text-slate-900">Sign in to SciPlan</h1>
        <p className="mt-2 text-sm text-slate-600">
          Plan a sound study step by step, with a final AI review. SciPlan is
          available to signed-in users only.
        </p>

        {(oauthEnabled.google || oauthEnabled.microsoft) && (
          <div className="mt-6 space-y-3">
            {oauthEnabled.google && (
              <form action={googleSignIn}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </form>
            )}
            {oauthEnabled.microsoft && (
              <form action={microsoftSignIn}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <MicrosoftIcon />
                  Continue with Microsoft
                </button>
              </form>
            )}
          </div>
        )}

        {(oauthEnabled.google || oauthEnabled.microsoft) && (
          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or sign in with a username
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        )}

        <form action={credentialsSignIn} className="mt-6 space-y-3">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Incorrect username or password.
            </p>
          )}
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Username</span>
            <input
              name="username"
              type="text"
              autoComplete="username"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Sign in
          </button>
        </form>
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">
        By signing in you agree that SciPlan is an educational aid, not a
        substitute for a supervisor, statistician, or ethics board.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  );
}
