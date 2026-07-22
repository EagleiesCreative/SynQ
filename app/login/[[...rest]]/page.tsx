import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white font-semibold mb-4"
          >
            S
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to access the counter or admin dashboard.
          </p>
        </div>

        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/register"
          fallbackRedirectUrl="/admin"
          appearance={{
            elements: {
              cardBox: "shadow-none border border-slate-200 rounded-2xl w-full",
              card: "p-6 shadow-none",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              footer: "bg-transparent",
              formButtonPrimary:
                "bg-brand-600 hover:bg-brand-700 text-sm normal-case shadow-none",
              formFieldInput: "rounded-lg border-slate-200",
              footerActionLink: "text-brand-600 hover:text-brand-700",
              socialButtonsBlockButton:
                "rounded-lg border-slate-200 hover:bg-slate-50 text-sm normal-case",
              dividerLine: "bg-slate-200",
              dividerText: "text-slate-400",
            },
          }}
        />
      </div>
    </main>
  );
}
