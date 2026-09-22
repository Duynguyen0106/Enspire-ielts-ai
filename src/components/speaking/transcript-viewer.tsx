"use client";

import { cn } from "@/lib/utils";

type TranscriptViewerProps = {
  transcript: string;
  highlightFillers?: boolean;
  pauses?: { startMs: number; endMs: number }[];
};

const FILLER_RE = /\b(um|uh|erm|ah|à|ừ|ờ|like|you know)\b/gi;

export function TranscriptViewer({
  transcript,
  highlightFillers = true,
  pauses,
}: TranscriptViewerProps) {
  const parts = highlightFillers
    ? transcript.split(FILLER_RE)
    : [transcript];

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3 text-sm leading-relaxed">
      <p>
        {parts.map((part, i) => {
          const isFiller = highlightFillers && FILLER_RE.test(part);
          FILLER_RE.lastIndex = 0;
          return (
            <span
              key={`${part}-${i}`}
              className={cn(isFiller && "rounded bg-amber-200/80 px-0.5 font-medium")}
            >
              {part}
            </span>
          );
        })}
      </p>
      {pauses && pauses.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Khoảng dừng phát hiện:{" "}
          {pauses
            .slice(0, 5)
            .map((p) => `${(p.startMs / 1000).toFixed(1)}s–${(p.endMs / 1000).toFixed(1)}s`)
            .join(", ")}
          {pauses.length > 5 ? "…" : ""}
        </p>
      ) : null}
    </div>
  );
}
