import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DEFAULT_FLAGS } from "@/lib/feature-flags";
import { FeatureFlagsClient } from "@/components/admin/feature-flags-client";

export const metadata: Metadata = { title: "Feature Flags" };

export default async function AdminFlagsPage() {
  for (const f of DEFAULT_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: {},
      create: {
        key: f.key,
        enabled: f.enabled,
        description: f.description,
      },
    });
  }
  const flags = await prisma.featureFlag.findMany({
    orderBy: { key: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Feature Flags</h1>
      <FeatureFlagsClient
        flags={flags.map((f) => ({
          id: f.id,
          key: f.key,
          enabled: f.enabled,
          description: f.description,
        }))}
      />
    </div>
  );
}
