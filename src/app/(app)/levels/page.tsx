import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Lộ trình",
};

export default async function LevelsPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const levels = await prisma.level.findMany({
    orderBy: { number: "asc" },
  });

  return (
    <>
      <AppHeader title="Lộ trình" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            9 cấp độ IELTS
          </h2>
          <p className="mt-1 text-muted-foreground">
            Level hiện tại của bạn được đánh dấu bên dưới.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {levels.map((level) => {
            const isCurrent = level.number === currentLevel;
            return (
              <Card
                key={level.id}
                className={cn(
                  isCurrent && "border-[var(--brand)] ring-2 ring-[var(--brand)]/20"
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{level.titleVi}</CardTitle>
                    {isCurrent ? <Badge>Hiện tại</Badge> : null}
                  </div>
                  <CardDescription>{level.title}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {level.descriptionVi}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
