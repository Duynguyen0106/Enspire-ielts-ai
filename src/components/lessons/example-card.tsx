type ExampleCardProps = {
  en: string;
  vi?: string;
};

export function ExampleCard({ en, vi }: ExampleCardProps) {
  return (
    <div className="border border-[var(--brand)]/20 bg-[var(--brand-soft)]/40 px-4 py-3">
      <p className="font-medium text-foreground">{en}</p>
      {vi ? (
        <p className="mt-1 text-sm text-muted-foreground">{vi}</p>
      ) : null}
    </div>
  );
}
