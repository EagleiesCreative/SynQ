"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";

/**
 * Completes an OAuth (Google / Apple / GitHub) sign-in or sign-up started
 * from /login or /register. Clerk redirects the browser back here after the
 * provider's consent screen; this page has no UI of its own beyond a
 * loading state and the bot-protection captcha mount point.
 */
export default function SsoCallbackPage() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const hasRun = useRef(false);

  const navigateToLogin = () => router.push("/login");

  const finalizeSignIn = async () => {
    await signIn.finalize({
      navigate: async ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        const url = decorateUrl("/admin");
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
  };

  const finalizeSignUp = async () => {
    await signUp.finalize({
      navigate: async ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        const url = decorateUrl("/admin");
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
  };

  useEffect(() => {
    (async () => {
      if (!clerk.loaded || hasRun.current) return;
      hasRun.current = true;

      if (signIn.status === "complete") {
        await finalizeSignIn();
        return;
      }

      // If the sign-up used an existing account, transfer it to a sign-in.
      if (signUp.isTransferable) {
        await signIn.create({ transfer: true });
        if ((signIn.status as typeof signIn.status | "complete") === "complete") {
          await finalizeSignIn();
          return;
        }
        return navigateToLogin();
      }

      if (
        signIn.status === "needs_first_factor" &&
        !signIn.supportedFirstFactors?.every((f) => f.strategy === "enterprise_sso")
      ) {
        return navigateToLogin();
      }

      // If the sign-in used an external account not tied to an existing user, create a sign-up.
      if (signIn.isTransferable) {
        await signUp.create({ transfer: true });
        if (signUp.status === "complete") {
          await finalizeSignUp();
          return;
        }
        return router.push("/register");
      }

      if (signUp.status === "complete") {
        await finalizeSignUp();
        return;
      }

      if (signIn.status === "needs_second_factor" || signIn.status === "needs_new_password") {
        return navigateToLogin();
      }

      if (signIn.existingSession || signUp.existingSession) {
        const sessionId =
          signIn.existingSession?.sessionId || signUp.existingSession?.sessionId;
        if (sessionId) {
          await clerk.setActive({
            session: sessionId,
            navigate: async ({ session, decorateUrl }) => {
              if (session?.currentTask) return;
              const url = decorateUrl("/admin");
              if (url.startsWith("http")) window.location.href = url;
              else router.push(url);
            },
          });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerk, signIn, signUp]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
        <p className="mt-4 text-sm text-slate-500">Finishing sign-in…</p>
      </div>
      {/* A sign-up transferred from sign-in might require captcha verification. */}
      <div id="clerk-captcha" />
    </main>
  );
}
