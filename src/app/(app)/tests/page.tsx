import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { ComingSoonCard } from "@/components/coming-soon-card";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Bài kiểm tra",
};

export default async function TestsPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const tests = await prisma.test.findMany({
    orderBy: { title: "asc" },
    include: { level: true },
  });

  return (
    <>
      <AppHeader title="Bài kiểm tra" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {tests.length === 0 ? (
          <ComingSoonCard
            title="Chưa có bài kiểm tra"
            description="Coming soon — bài kiểm tra sẽ xuất hiện khi được xuất bản."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tests.map((test) => (
              <Card key={test.id}>
                <CardHeader>
                  <CardTitle>{test.title}</CardTitle>
                  <CardDescription>
                    {test.type} · {test.durationMin} phút
                    {test.level ? ` · Level ${test.level.number}` : ""}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
