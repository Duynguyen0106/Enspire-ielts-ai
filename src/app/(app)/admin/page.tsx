import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { ComingSoonCard } from "@/components/coming-soon-card";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const user = await requireAdmin();
  const currentLevel = user.profile?.currentLevel ?? 1;

  return (
    <>
      <AppHeader title="Admin" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <ComingSoonCard
          title="Admin panel"
          description="Admin panel coming soon"
        />
      </div>
    </>
  );
}
