import type { ReactNode } from "react";

export default function ExamLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col overflow-y-auto bg-background text-foreground">
      <a href="#exam-main" className="sr-only focus:not-sr-only">
        Bỏ qua đến nội dung thi
      </a>
      <main
        id="exam-main"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 py-3 sm:px-4 md:px-6 md:py-4"
      >
        {children}
      </main>
    </div>
  );
}
