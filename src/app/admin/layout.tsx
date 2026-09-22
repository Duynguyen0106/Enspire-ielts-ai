import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdminAccess } from "@/lib/admin";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/content", label: "Content Review" },
  { href: "/admin/tests", label: "Tests" },
  { href: "/admin/ai-logs", label: "AI Logs" },
  { href: "/admin/feature-flags", label: "Feature Flags" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminAccess();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 border-r p-4 md:block">
        <p className="mb-4 text-sm font-semibold">Admin</p>
        <nav className="space-y-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-2 py-1.5 hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/dashboard"
          className="mt-8 block text-xs text-muted-foreground underline"
        >
          ← Back to app
        </Link>
      </aside>
      <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
    </div>
  );
}
