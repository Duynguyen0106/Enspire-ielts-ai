"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Item = {
  id: string;
  kind: "review" | "lesson";
  refType: string;
  refId: string;
  status: string;
  title: string;
  body: string;
};

export function ContentReviewClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  async function act(
    action: string,
    ids: string[],
    notesVi?: string
  ) {
    await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids, notesVi }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() =>
            void act(
              "approve",
              selected.length ? selected : items.map((i) => i.id)
            )
          }
        >
          Approve selected / all
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void act("reject", selected, "Rejected by admin")}
        >
          Reject selected
        </Button>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Queue empty.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-xl border p-4">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={(e) =>
                    setSelected((s) =>
                      e.target.checked
                        ? [...s, item.id]
                        : s.filter((x) => x !== item.id)
                    )
                  }
                />
                <div className="flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.status}</p>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                    {item.body}
                  </pre>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="xs"
                      onClick={() => void act("approve", [item.id])}
                    >
                      Approve
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        void act("needs_edit", [item.id], "Needs edit")
                      }
                    >
                      Needs edit
                    </Button>
                    <Button
                      size="xs"
                      variant="destructive"
                      onClick={() => void act("reject", [item.id], "Reject")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
