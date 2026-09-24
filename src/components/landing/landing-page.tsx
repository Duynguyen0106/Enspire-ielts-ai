import Link from "next/link";
import {
  BookOpenCheck,
  Brain,
  ClipboardCheck,
  Mic2,
  Route,
  Sparkles,
} from "lucide-react";
import { auth } from "@/auth";
import { LandingLiveDemo } from "@/components/landing/live-demo";
import "@/components/landing/landing-theme.css";

export async function LandingPage() {
  const session = await auth();

  return (
    <div className="landing-theme landing-grid-bg relative min-h-screen overflow-x-hidden">
      <header className="relative z-10 border-b border-border/60 bg-card/40 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 font-display text-sm font-bold text-primary ring-1 ring-primary/40">
              VI
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              VietIELTS AI
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {session ? (
              <Link
                href="/dashboard"
                className="glow-primary rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Vào Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="glow-primary rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero — brand + one headline + one line + CTAs + dominant demo */}
        <section className="relative mx-auto max-w-5xl px-6 pb-10 pt-12 text-center sm:pb-14 sm:pt-20">
          <p className="landing-fade font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            VietIELTS AI
          </p>
          <h1 className="landing-fade-d1 mx-auto mt-4 max-w-3xl text-balance font-display text-2xl font-semibold tracking-tight text-foreground/95 sm:text-3xl md:text-4xl">
            Học IELTS cùng AI,{" "}
            <span className="neon-text">một band một bước</span>.
          </h1>
          <p className="landing-fade-d2 mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Luyện 4 kỹ năng, thi thử Academic, nhận chấm Writing & Speaking bằng
            tiếng Việt — lộ trình 9 cấp độ cho người Việt.
          </p>
          <div className="landing-fade-d3 mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            {session ? (
              <Link
                href="/dashboard"
                className="glow-primary inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Tiếp tục học
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="glow-primary inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Bắt đầu miễn phí
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex min-h-12 items-center justify-center rounded-md border border-accent/50 bg-card/50 px-5 py-2.5 text-sm font-medium backdrop-blur transition hover:border-accent hover:text-accent"
                >
                  Xem gói Pro
                </Link>
              </>
            )}
          </div>
        </section>

        <section aria-label="Live demo" className="mx-auto max-w-5xl px-6 pb-16">
          <div className="mb-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-[var(--neon-pink)]">
            <span>[ 00 / LIVE DEMO ]</span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-pink)] shadow-[0_0_8px_var(--neon-pink)]" />
              AUTO-PLAY · 4 SCENES
            </span>
          </div>
          <LandingLiveDemo />
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--neon-pink)]">
            [ 01 / THÁCH THỨC ]
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Luyện IELTS thật khó nếu không có vòng phản hồi nhanh.
          </h2>
          <p className="mt-4 max-w-3xl text-pretty text-muted-foreground">
            Sách cho bạn đề; lớp học cho bạn lịch. Còn khoảng trống giữa hai cái
            đó — viết xong không biết band, nói xong không biết lỗi — thì tiến bộ
            chậm lại.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Challenge
              n="01"
              title="Ít lần thi thử thật"
              body="Một buổi mock mỗi tháng không đủ để quen áp lực Listening–Reading–Writing–Speaking."
            />
            <Challenge
              n="02"
              title="Chấm chậm, chung chung"
              body="Chờ giáo viên vài ngày; feedback chung “cần luyện thêm” không chỉ ra lỗi cụ thể."
            />
            <Challenge
              n="03"
              title="Không biết bước tiếp theo"
              body="Band 5.5 và band 7 cần lộ trình khác nhau — thiếu map 1–9 thì dễ luyện lan man."
            />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--neon-pink)]">
            [ 02 / GIẢI PHÁP ]
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Một vòng luyện tập như ngày thi thật — mỗi ngày.
          </h2>
          <p className="mt-4 max-w-3xl text-pretty text-muted-foreground">
            VietIELTS AI chạy placement, bài học theo level, đề thi thử Academic,
            và chấm Writing/Speaking theo band descriptors — giải thích bằng
            tiếng Việt để bạn sửa ngay.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "Placement test → vào đúng level",
              "Luyện Listening & Reading có đáp án",
              "Writing & Speaking gym + AI examiner",
              "Full level test 1–9 + đề thi thử Academic",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-sm"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--neon-pink)] shadow-[0_0_8px_var(--neon-pink)]" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--neon-pink)]">
            [ 03 / TÍNH NĂNG ]
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Mọi thứ cần để nghĩ như ngày thi IELTS.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<BookOpenCheck className="h-4 w-4" />}
              title="4 kỹ năng"
              body="Listening, Reading, Writing, Speaking theo format Academic."
            />
            <Feature
              icon={<Sparkles className="h-4 w-4" />}
              title="AI chấm điểm"
              body="Band + tiêu chí + sửa lỗi, giải thích tiếng Việt."
            />
            <Feature
              icon={<Route className="h-4 w-4" />}
              title="Lộ trình 1–9"
              body="Mở khóa level khi đạt; biết rõ bạn đang ở đâu."
            />
            <Feature
              icon={<ClipboardCheck className="h-4 w-4" />}
              title="Đề thi thử"
              body="Mock Academic full exam — luyện như ngày thi thật."
            />
            <Feature
              icon={<Mic2 className="h-4 w-4" />}
              title="Speaking gym"
              body="Part 1–3, cue card, phản hồi fluency & lexical."
            />
            <Feature
              icon={<Brain className="h-4 w-4" />}
              title="Tutor coach"
              body="Hỏi–đáp theo bài học; không đưa đáp án sẵn."
            />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16 text-center">
          <div className="neon-panel rounded-2xl px-6 py-12 sm:px-10">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Sẵn sàng lên band?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Tạo tài khoản miễn phí — làm placement và bắt đầu level phù hợp
              trong vài phút.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
              <Link
                href={session ? "/dashboard" : "/register"}
                className="glow-primary inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                {session ? "Vào Dashboard" : "Bắt đầu miễn phí"}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-primary/50 bg-card/50 px-6 py-2.5 text-sm font-medium backdrop-blur transition hover:border-primary hover:text-primary"
              >
                Xem bảng giá
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-3 text-sm text-muted-foreground">
          <p className="font-display font-semibold text-foreground">VietIELTS AI</p>
          <p className="max-w-3xl">
            VietIELTS AI là công cụ luyện tập. Điểm số do AI đưa ra chỉ mang tính
            tham khảo, không phải điểm IELTS chính thức.
          </p>
          <p className="max-w-3xl text-xs leading-relaxed">
            IELTS is a registered trademark of the British Council, IDP: IELTS
            Australia and Cambridge Assessment English. VietIELTS AI is not
            affiliated with or endorsed by any of these organizations.
          </p>
          <div className="flex flex-wrap gap-4 pt-2 text-xs">
            <Link href="/privacy" className="underline-offset-2 hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="underline-offset-2 hover:underline">
              Terms
            </Link>
            <Link href="/pricing" className="underline-offset-2 hover:underline">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Challenge({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <article className="glass-card rounded-xl p-5">
      <div className="font-mono text-[11px] uppercase tracking-widest text-[var(--neon-pink)]">
        {n} · {title}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
    </article>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--neon-pink)]">
        {icon}
        {title}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
    </article>
  );
}
