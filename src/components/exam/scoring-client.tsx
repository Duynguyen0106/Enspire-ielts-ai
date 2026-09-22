"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScoringProgress } from "@/components/exam/scoring-progress";

export function ScoringClient({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [scoringStatus, setScoringStatus] = useState("SCORING");
  const [scoringError, setScoringError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const res = await fetch(`/api/tests/attempts/${attemptId}`);
      const json = (await res.json()) as {
        scoringStatus?: string;
        scoringError?: string;
      };
      if (cancelled) return;
      setScoringStatus(json.scoringStatus ?? "SCORING");
      setScoringError(json.scoringError ?? null);
      if (json.scoringStatus === "SCORED") {
        router.replace(`/tests/attempts/${attemptId}/result`);
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [attemptId, router]);

  return (
    <ScoringProgress
      scoringStatus={scoringStatus}
      scoringError={scoringError}
      onRetry={() => {
        void fetch(`/api/tests/attempts/${attemptId}`, { method: "POST" }).then(
          () => setScoringStatus("SCORING")
        );
      }}
    />
  );
}
