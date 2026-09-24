export function AiDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={
        className ??
        "rounded-lg border border-accent/35 bg-accent/10 px-3 py-2 text-sm text-foreground"
      }
    >
      Điểm do AI ước lượng chỉ mang tính tham khảo, không phải điểm IELTS chính
      thức.
    </p>
  );
}
