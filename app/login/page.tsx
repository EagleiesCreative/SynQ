"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";
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

export default function LoginPage() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [oauthBusy, setOauthBusy] = useState<SupportedOAuthStrategy | null>(null);

  const busy = fetchStatus === "fetching" || !!oauthBusy;

  async function finish() {
    await signIn.finalize({
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
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;

    if (signIn.status === "complete") {
      await finish();
    } else if (signIn.status === "needs_client_trust") {
      const emailFactor = signIn.supportedSecondFactors?.find(
        (f) => f.strategy === "email_code"
      );
      if (emailFactor) await signIn.mfa.sendEmailCode();
    }
  }

  async function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await signIn.mfa.verifyEmailCode({ code });
    if (signIn.status === "complete") await finish();
  }

  async function handleOAuth(strategy: SupportedOAuthStrategy) {
    setOauthBusy(strategy);
    const { error } = await signIn.sso({
      strategy,
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/admin",
    });
    if (error) setOauthBusy(null);
  }

  if (signIn.status === "needs_client_trust") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Logo />
            <h1 className="text-xl font-semibold text-slate-900">Verify it&apos;s you</h1>
            <p className="mt-1 text-sm text-slate-500">
              We sent a code to your email to confirm this is your device.
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
                  Verify
                </Button>
              </form>
              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  onClick={() => signIn.mfa.sendEmailCode()}
                  className="text-brand-600 hover:underline"
                >
                  Resend code
                </button>
                <button
                  onClick={() => signIn.reset()}
                  className="text-slate-400 hover:underline"
                >
                  Start over
                </button>
              </div>
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
          <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to access the counter or admin dashboard.
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
                {errors.fields.identifier && (
                  <p className="mt-1.5 text-sm text-rose-600">
                    {errors.fields.identifier.message}
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
                  placeholder="••••••••"
                />
                {errors.fields.password && (
                  <p className="mt-1.5 text-sm text-rose-600">
                    {errors.fields.password.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" size="md" disabled={busy}>
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-sm text-slate-500">
          First time here?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Create the first admin account
          </Link>
        </p>
      </div>
    </main>
  );
}
