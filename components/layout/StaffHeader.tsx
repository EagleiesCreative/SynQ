import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export function StaffHeader({
  title,
  fullName,
  nav,
}: {
  title: string;
  fullName: string;
  nav?: { href: string; label: string }[];
}) {
  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand-600 text-white font-semibold flex items-center justify-center text-xs">
              S
            </div>
            <span className="font-semibold text-slate-900 text-sm">
              {title}
            </span>
          </Link>
          {nav && (
            <nav className="hidden sm:flex items-center gap-1">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:inline">
            {fullName}
          </span>
          <UserButton />
        </div>
      </div>
    </header>
  );
}
