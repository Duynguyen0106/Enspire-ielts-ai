"use client";

type GraduationScreenProps = {
  band: number;
};

export function GraduationScreen({ band }: GraduationScreenProps) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
        Bạn đã hoàn thành toàn bộ lộ trình!
      </h2>
      <p className="mt-2 text-muted-foreground">
        Level 9 đạt band {band.toFixed(1)}. Chúc mừng bạn!
      </p>
      <button
        type="button"
        className="mt-6 rounded-md bg-[var(--brand)] px-4 py-2 text-sm text-white"
        onClick={() => {
          const text = `Tôi vừa hoàn thành lộ trình VietIELTS AI với band ${band.toFixed(1)}!`;
          if (navigator.share) {
            void navigator.share({ text });
          } else {
            void navigator.clipboard.writeText(text);
          }
        }}
      >
        Chia sẻ thành tích
      </button>
    </div>
  );
}
