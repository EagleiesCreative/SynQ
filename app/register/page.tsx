"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignUp, useAuth, useClerk } from "@clerk/nextjs";
import type { SupportedOAuthStrategy } from "@/lib/auth-strategy";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { AlertCircle } from "lucide-react";

function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white font-semibold mb-4"
    >
      S
    </Link>
  );
}

export default function RegisterPage() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [oauthBusy, setOauthBusy] = useState<SupportedOAuthStrategy | null>(null);

  const busy = fetchStatus === "fetching" || !!oauthBusy;

  async function finish() {
    await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        const url = decorateUrl("/admin");
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) return;
    await signUp.verifications.sendEmailCode();
  }

  async function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") await finish();
  }

  async function handleOAuth(strategy: SupportedOAuthStrategy) {
    setOauthBusy(strategy);
    const { error } = await signUp.sso({
      strategy,
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/admin",
    });
    if (error) setOauthBusy(null);
  }

  const needsEmailVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  if (isSignedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
        <div className="w-full max-w-sm text-center">
          <Logo />
          <h1 className="text-xl font-semibold text-slate-900">You&apos;re already signed in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Head to your dashboard, or sign out to create a different account.
          </p>
          <div className="mt-6 space-y-2">
            <Button className="w-full" onClick={() => router.push("/admin")}>
              Go to dashboard
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await clerk.signOut();
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (needsEmailVerification) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Logo />
            <h1 className="text-xl font-semibold text-slate-900">Check your email</h1>
            <p className="mt-1 text-sm text-slate-500">
              We sent a verification code to {email}.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    placeholder="123456"
                  />
                  {errors.fields.code && (
                    <p className="mt-1.5 text-sm text-rose-600">
                      {errors.fields.code.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  Verify and create account
                </Button>
              </form>
              <button
                onClick={() => signUp.verifications.sendEmailCode()}
                className="mt-4 text-sm text-brand-600 hover:underline"
              >
                I need a new code
              </button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo />
          <h1 className="text-xl font-semibold text-slate-900">Create staff account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set up an account to manage counters and services. The first account
            created becomes the admin.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-5">
            {errors.global && errors.global.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{errors.global[0].longMessage || errors.global[0].message}</span>
              </div>
            )}

            <OAuthButtons onSelect={handleOAuth} busy={busy} />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                />
                {errors.fields.emailAddress && (
                  <p className="mt-1.5 text-sm text-rose-600">
                    {errors.fields.emailAddress.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
                {errors.fields.password && (
                  <p className="mt-1.5 text-sm text-rose-600">
                    {errors.fields.password.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" size="md" disabled={busy}>
                Create account
              </Button>
            </form>

            {/* Required for sign-up flows: Clerk's bot sign-up protection */}
            <div id="clerk-captcha" />
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
