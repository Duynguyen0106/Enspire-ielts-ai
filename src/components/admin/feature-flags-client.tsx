"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Flag = {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
};

export function FeatureFlagsClient({ flags }: { flags: Flag[] }) {
  const router = useRouter();

  async function toggle(id: string, enabled: boolean) {
    await fetch("/api/admin/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled: !enabled }),
    });
    router.refresh();
  }

  return (
    <ul className="space-y-3">
      {flags.map((f) => (
        <li
          key={f.id}
          className="flex items-center justify-between rounded-xl border p-4"
        >
          <div>
            <p className="font-medium">{f.key}</p>
            <p className="text-sm text-muted-foreground">{f.description}</p>
          </div>
          <Button
            size="sm"
            variant={f.enabled ? "default" : "outline"}
            onClick={() => void toggle(f.id, f.enabled)}
          >
            {f.enabled ? "ON" : "OFF"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
