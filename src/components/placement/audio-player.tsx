"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";

type AudioPlayerProps = {
  src: string;
  maxPlays?: number;
};

export function AudioPlayer({ src, maxPlays = 2 }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);

  const canPlay = plays < maxPlays;

  async function handlePlay() {
    if (!audioRef.current || !canPlay) return;
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setPlaying(true);
      setPlays((p) => p + 1);
    } catch {
      setPlaying(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onEnded={() => setPlaying(false)}
      />
      <Button
        type="button"
        onClick={() => void handlePlay()}
        disabled={!canPlay || playing}
      >
        <Play className="size-4" />
        {playing ? "Đang phát…" : "Phát audio"}
      </Button>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Đã phát {plays}/{maxPlays} lần
        {!canPlay ? " — hết lượt nghe." : ""}
      </p>
      {plays > 0 && canPlay ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <RotateCcw className="size-3" /> Còn 1 lượt nghe lại
        </span>
      ) : null}
    </div>
  );
}
