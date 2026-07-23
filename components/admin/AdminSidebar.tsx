"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListOrdered, Users2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Queue", icon: ListOrdered, adminOnly: false },
  {
    href: "/admin/whatsapp",
    label: "Notifications",
    icon: MessageCircle,
    adminOnly: true,
  },
  { href: "/admin/staff", label: "Staff", icon: Users2, adminOnly: true },
];

export function AdminSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const visible = items.filter((i) => isAdmin || !i.adminOnly);

  // A lone tab is just noise.
  if (visible.length < 2) return null;

  return (
    <aside className="sm:w-56 shrink-0">
      <nav className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
        {visible.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              )}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
