"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EssayDiff } from "@/components/writing/essay-diff";
import { cn } from "@/lib/utils";

type Model = { text: string; notesVi: string[] };

type ModelAnswerTabsProps = {
  band6: Model;
  band75: Model;
  band9: Model;
  userText: string;
};

const TABS = [
  { key: "6", label: "Band 6.0" },
  { key: "75", label: "Band 7.5" },
  { key: "9", label: "Band 9.0" },
] as const;

export function ModelAnswerTabs({
  band6,
  band75,
  band9,
  userText,
}: ModelAnswerTabsProps) {
  const [tab, setTab] = useState<"6" | "75" | "9">("6");
  const [compare, setCompare] = useState(false);
  const model = tab === "6" ? band6 : tab === "75" ? band75 : band9;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setCompare(false);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              tab === t.key && "border-[var(--brand)] bg-[var(--brand-soft)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void navigator.clipboard.writeText(model.text)}
        >
          Sao chép
        </Button>
        {tab === "6" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCompare((v) => !v)}
          >
            {compare ? "Ẩn so sánh" : "So sánh với bài của bạn"}
          </Button>
        ) : null}
      </div>
      {compare && tab === "6" ? (
        <EssayDiff userText={userText} modelText={model.text} />
      ) : (
        <pre className="whitespace-pre-wrap rounded-lg border bg-card p-4 text-sm leading-relaxed">
          {model.text}
        </pre>
      )}
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {model.notesVi.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
