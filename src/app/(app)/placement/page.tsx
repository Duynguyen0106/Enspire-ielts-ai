import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Bài kiểm tra đầu vào",
};

export default async function PlacementPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;

  return (
    <>
      <AppHeader title="Bài kiểm tra đầu vào" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Placement test</CardTitle>
            <CardDescription>
              Coming soon — bài kiểm tra đầu vào sẽ có trong Phase 2.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" render={<Link href="/dashboard" />}>
              Quay lại Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
