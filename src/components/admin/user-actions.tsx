"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  userId: string;
  role: string;
  currentLevel: number;
  plan: string;
};

export function AdminUserActions({
  userId,
  role,
  currentLevel,
  plan,
}: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function act(action: string, body: Record<string, unknown> = {}) {
    setMsg(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const json = (await res.json()) as { error?: string; ok?: boolean };
    if (!res.ok) {
      setMsg(json.error ?? "Failed");
      return;
    }
    setMsg("Saved");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          void act("setRole", { role: role === "ADMIN" ? "USER" : "ADMIN" })
        }
      >
        Toggle role ({role})
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void act("grantPro")}
        disabled={plan === "PRO"}
      >
        Grant Pro (comp)
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          void act("setLevel", {
            level: Math.min(9, currentLevel + 1),
          })
        }
      >
        Level +1
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void act("resetPlacement")}
      >
        Reset placement
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => {
          if (confirm("Hard delete this user?")) void act("hardDelete");
        }}
      >
        Hard delete
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
