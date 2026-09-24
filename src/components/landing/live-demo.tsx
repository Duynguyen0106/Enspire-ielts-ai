"use client";

import { useEffect, useState } from "react";

const SCENES = [
  {
    label: "01 / Writing Task 2",
    body: (
      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-border/60 bg-card/50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Learner
          </p>
          <p className="mt-1 text-foreground/90">
            Some people believe public libraries are no longer necessary…
          </p>
        </div>
        <div className="ml-4 rounded-lg border border-[var(--neon-pink)]/40 bg-[color-mix(in_oklab,var(--neon-pink)_6%,transparent)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--neon-pink)]">
            AI Examiner · Writing
          </p>
          <p className="mt-1">
            Overall <span className="font-semibold text-[var(--neon-pink)]">6.5</span> — strengthen
            Task Response with a clearer stance in the intro.
          </p>
        </div>
      </div>
    ),
  },
  {
    label: "02 / Speaking Part 2",
    body: (
      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-border/60 bg-card/50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Cue card
          </p>
          <p className="mt-1">Describe a quiet place you like to study…</p>
        </div>
        <div className="ml-4 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Feedback · Fluency
          </p>
          <p className="mt-1">
            Band <span className="font-semibold text-primary">7.0</span> — fewer fillers; extend with
            one concrete example.
          </p>
        </div>
      </div>
    ),
  },
  {
    label: "03 / Full mock result",
    body: (
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["L", "7.5"],
            ["R", "7.0"],
            ["W", "6.5"],
            ["S", "7.0"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded-lg border border-border/60 bg-card/50 px-3 py-3 text-center"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {k}
              </p>
              <p className="mt-1 font-display text-xl font-semibold text-[var(--neon-pink)]">
                {v}
              </p>
            </div>
          ))}
        </div>
        <p className="rounded-lg border border-[var(--neon-pink)]/35 bg-[color-mix(in_oklab,var(--neon-pink)_8%,transparent)] px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[var(--neon-pink)]">
          Overall 7.0 · unlock Level 7 practice path
        </p>
      </div>
    ),
  },
  {
    label: "04 / Tutor coach",
    body: (
      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-border/60 bg-card/50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Tutor
          </p>
          <p className="mt-1">
            Rewrite this sentence with a clearer topic sentence — keep your idea, fix cohesion.
          </p>
        </div>
        <div className="ml-4 rounded-lg border border-[var(--neon-pink)]/40 bg-[color-mix(in_oklab,var(--neon-pink)_6%,transparent)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--neon-pink)]">
            You
          </p>
          <p className="mt-1">Libraries still matter because they create free study space…</p>
        </div>
      </div>
    ),
  },
] as const;

export function LandingLiveDemo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SCENES.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  const scene = SCENES[index]!;

  return (
    <div className="neon-panel relative overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-border/60 bg-card/60 px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-pink)] shadow-[0_0_6px_var(--neon-pink)]" />
          vietielts · session #B7E2
        </div>
        <div className="hidden gap-1.5 sm:flex">
          {SCENES.map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full transition-all"
              style={{
                width: i === index ? 24 : 10,
                background:
                  i === index
                    ? "var(--neon-pink)"
                    : "color-mix(in oklab, var(--neon-pink) 25%, transparent)",
                boxShadow: i === index ? "0 0 8px var(--neon-pink)" : "none",
              }}
            />
          ))}
        </div>
      </div>
      <div className="p-5 sm:p-6" key={index}>
        <div className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--neon-pink)]">
          <span>[ {scene.label} ]</span>
        </div>
        <div className="landing-demo-scene min-h-[220px]">{scene.body}</div>
      </div>
    </div>
  );
}
