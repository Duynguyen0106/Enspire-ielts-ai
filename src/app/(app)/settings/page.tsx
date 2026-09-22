import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { SettingsForm } from "@/components/auth/settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Cài đặt",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;

  return (
    <>
      <AppHeader title="Cài đặt" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ</CardTitle>
            <CardDescription>
              Cập nhật tên hiển thị và mục tiêu band IELTS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm
              displayName={
                user.profile?.displayName ?? user.name ?? "Học viên"
              }
              targetBand={user.profile?.targetBand ?? 6.0}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
