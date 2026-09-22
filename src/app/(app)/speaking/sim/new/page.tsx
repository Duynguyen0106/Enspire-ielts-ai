import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { SpeakingRunner } from "@/components/speaking/speaking-runner";

export const metadata: Metadata = { title: "Speaking Full Sim" };

export default async function SpeakingSimPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;

  return (
    <>
      <AppHeader title="Thi thử Speaking" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <SpeakingRunner mode="sim" level={currentLevel} />
      </div>
    </>
  );
}
