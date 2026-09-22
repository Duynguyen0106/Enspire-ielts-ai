import Link from "next/link";
import { BookOpenCheck, Sparkles, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";

export default async function LandingPage() {
  const session = await auth();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#d8f3e7_0%,_transparent_45%),radial-gradient(ellipse_at_bottom_left,_#f3efe4_0%,_transparent_40%),linear-gradient(180deg,_#f7fbf9_0%,_#eef6f2_100%)]" />
      <div className="hero-glow pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[var(--brand)]/15 blur-3xl" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--brand-deep)]"
        >
          VietIELTS AI
        </Link>
        <div className="flex items-center gap-2">
          {session ? (
            <Button render={<Link href="/dashboard" />}>Vào Dashboard</Button>
          ) : (
            <>
              <Button variant="ghost" render={<Link href="/login" />}>
                Đăng nhập
              </Button>
              <Button render={<Link href="/register" />}>Bắt đầu miễn phí</Button>
            </>
          )}
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto flex min-h-[75vh] w-full max-w-6xl flex-col justify-center px-6 pb-16 pt-8">
          <p className="animate-fade-up mb-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-[var(--brand-deep)] sm:text-5xl md:text-6xl">
            VietIELTS AI
          </p>
          <h1 className="animate-fade-up-delay max-w-3xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Học IELTS cùng AI dành cho người Việt
          </h1>
          <p className="animate-fade-up-delay-2 mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            4 kỹ năng. 9 cấp độ. Lộ trình cá nhân hóa.
          </p>
          <div className="animate-fade-up-delay-2 mt-8 flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/register" />}>
              Bắt đầu miễn phí
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/login" />}>
              Đăng nhập
            </Button>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-20 md:grid-cols-3">
          <Feature
            icon={<BookOpenCheck className="size-5" />}
            title="Luyện 4 kỹ năng"
            description="Listening, Reading, Writing và Speaking theo chuẩn IELTS."
          />
          <Feature
            icon={<Sparkles className="size-5" />}
            title="AI chấm Writing & Speaking"
            description="Nhận phản hồi chi tiết bằng tiếng Việt, luyện tập mỗi ngày."
          />
          <Feature
            icon={<Route className="size-5" />}
            title="Lộ trình 1–9"
            description="Tiến bộ từng cấp độ từ người mới bắt đầu đến thành thạo."
          />
        </section>
      </main>

      <footer className="relative z-10 border-t bg-white/60 px-6 py-8 backdrop-blur">
        <div className="mx-auto max-w-6xl text-sm text-muted-foreground">
          <p className="font-medium text-foreground">VietIELTS AI</p>
          <p className="mt-2 max-w-3xl">
            VietIELTS AI là công cụ luyện tập. Điểm số do AI đưa ra chỉ mang tính
            tham khảo, không phải điểm IELTS chính thức.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
        {icon}
      </div>
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
