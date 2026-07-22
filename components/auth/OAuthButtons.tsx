"use client";

import { Github } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SupportedOAuthStrategy } from "@/lib/auth-strategy";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.998 11.998 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.93.46 3.76 1.27 5.39l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.462 2.11-1.19 2.87-.79.85-2.07 1.5-3.11 1.42-.13-1.1.46-2.25 1.16-2.98.79-.83 2.17-1.45 3.14-1.31ZM20.6 17.14c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.12 3.51-1.53.02-1.93-1-4.01-.99-2.08.01-2.52 1.01-4.05.99-1.73-.02-3.06-1.77-4.05-3.32C.16 16.9-.42 12.2 1.4 9.02c.83-1.46 2.31-2.39 3.92-2.42 1.55-.03 2.51 1.05 4.01 1.05 1.5 0 2.35-1.05 4.01-1.05 1.34.02 2.51.5 3.44 1.5-3 1.65-2.52 5.94.42 7.05-.4 1.06-.87 1.99-1.6 3.99Z" />
    </svg>
  );
}

const PROVIDERS: { strategy: SupportedOAuthStrategy; label: string; icon: React.ReactNode }[] = [
  { strategy: "oauth_google", label: "Continue with Google", icon: <GoogleIcon /> },
  { strategy: "oauth_apple", label: "Continue with Apple", icon: <AppleIcon /> },
  { strategy: "oauth_github", label: "Continue with GitHub", icon: <Github size={16} /> },
];

export function OAuthButtons({
  onSelect,
  busy,
}: {
  onSelect: (strategy: SupportedOAuthStrategy) => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-2">
      {PROVIDERS.map((p) => (
        <Button
          key={p.strategy}
          type="button"
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={() => onSelect(p.strategy)}
          disabled={busy}
        >
          {p.icon}
          {p.label}
        </Button>
      ))}
    </div>
  );
}
