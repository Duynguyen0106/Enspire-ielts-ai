import type { Metadata } from "next";
import Link from "next/link";
import { Ear, BookOpen, PenLine, Mic } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Luyện tập",
};

const practices = [
  {
    href: "/practice/listening",
    title: "Listening",
    titleVi: "Nghe",
    icon: Ear,
  },
  {
    href: "/practice/reading",
    title: "Reading",
    titleVi: "Đọc",
    icon: BookOpen,
  },
  {
    href: "/practice/writing",
    title: "Writing",
    titleVi: "Viết",
    icon: PenLine,
  },
  {
    href: "/practice/speaking",
    title: "Speaking",
    titleVi: "Nói",
    icon: Mic,
  },
] as const;

export default async function PracticePage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;

  return (
    <>
      <AppHeader title="Luyện tập" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Luyện 4 kỹ năng
          </h2>
          <p className="mt-1 text-muted-foreground">
            Chọn kỹ năng để bắt đầu luyện tập.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {practices.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="block">
                <Card className="transition-colors hover:border-[var(--brand)]/40 hover:bg-[var(--brand-soft)]/40">
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle>
                      {item.titleVi} · {item.title}
                    </CardTitle>
                    <CardDescription>Coming soon</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
