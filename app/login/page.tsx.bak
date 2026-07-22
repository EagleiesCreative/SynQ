import Link from "next/link";
import { signIn, signUp, signOut } from "./actions";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AlertCircle, ArrowRight } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const mode = params.mode === "signup" ? "signup" : "signin";
  const error = params.error;
  const redirectTo = params.redirect || "/admin";

  const { user, profile } = await getCurrentUserAndProfile();

  if (user) {
    const dashboardHref = profile?.role === "admin" ? "/admin" : "/counter";
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white font-semibold mb-4">
            S
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">
            You&apos;re already signed in
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as {profile?.full_name || user.email}
            {profile?.role ? ` (${profile.role})` : ""}.
          </p>

          <div className="mt-6 space-y-3">
            <Link href={dashboardHref}>
              <Button className="w-full" size="md">
                Go to dashboard <ArrowRight size={16} />
              </Button>
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="outline" className="w-full" size="md">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white font-semibold mb-4">
            S
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">
            {mode === "signup" ? "Create staff account" : "Sign in"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "signup"
              ? "Set up an account to manage counters and services."
              : "Sign in to access the counter or admin dashboard."}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === "signin" ? (
              <form action={signIn} className="space-y-4">
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="you@company.com" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full" size="md">
                  Sign in
                </Button>
              </form>
            ) : (
              <form action={signUp} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" name="fullName" type="text" required placeholder="Jane Doe" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="you@company.com" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required minLength={6} placeholder="At least 6 characters" />
                </div>
                <Button type="submit" className="w-full" size="md">
                  Create account
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-sm text-slate-500">
          {mode === "signin" ? (
            <>
              First time here?{" "}
              <Link href="/login?mode=signup" className="font-medium text-brand-600 hover:underline">
                Create the first admin account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-brand-600 hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
