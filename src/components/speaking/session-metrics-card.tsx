type SessionMetricsCardProps = {
  wpm: number;
  pauseCount: number;
  fillerCount: number;
};

export function SessionMetricsCard({
  wpm,
  pauseCount,
  fillerCount,
}: SessionMetricsCardProps) {
  return (
    <div className="grid grid-cols-3 gap-2 border bg-card p-3 text-center">
      <div>
        <p className="text-xl font-semibold text-[var(--brand)]">{wpm}</p>
        <p className="text-xs text-muted-foreground">WPM</p>
      </div>
      <div>
        <p className="text-xl font-semibold text-[var(--brand)]">{pauseCount}</p>
        <p className="text-xs text-muted-foreground">Pauses</p>
      </div>
      <div>
        <p className="text-xl font-semibold text-[var(--brand)]">{fillerCount}</p>
        <p className="text-xs text-muted-foreground">Fillers</p>
      </div>
    </div>
  );
}
