import type { ReactNode } from "react";

export default function ExamLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#exam-main" className="sr-only focus:not-sr-only">
        Bỏ qua đến nội dung thi
      </a>
      <main id="exam-main" className="mx-auto max-w-6xl px-4 py-4 md:px-6">
        {children}
      </main>
    </div>
  );
}
