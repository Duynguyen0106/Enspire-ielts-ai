export function AiDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={
        className ??
        "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      }
    >
      Điểm do AI ước lượng chỉ mang tính tham khảo, không phải điểm IELTS chính
      thức.
    </p>
  );
}
