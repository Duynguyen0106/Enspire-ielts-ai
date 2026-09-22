import { MarkdownContent } from "@/components/lessons/markdown-content";
import { ExampleCard } from "@/components/lessons/example-card";
import { AudioPlayer } from "@/components/placement/audio-player";

type LessonContentView = {
  objectiveVi?: string;
  warmup?: { questionVi: string; tipsVi: string[] };
  sections?: {
    headingVi: string;
    headingEn?: string;
    contentMd: string;
    examplesEn?: string[];
  }[];
  passage?: string;
  audioUrl?: string;
  audioScript?: string;
};

type LessonRendererProps = {
  titleVi: string;
  content: LessonContentView;
};

export function LessonRenderer({ titleVi, content }: LessonRendererProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold md:text-3xl">
          {titleVi}
        </h1>
        {content.objectiveVi ? (
          <p className="text-muted-foreground">{content.objectiveVi}</p>
        ) : null}
      </header>

      {content.audioUrl ? (
        <AudioPlayer src={content.audioUrl} maxPlays={2} />
      ) : null}

      {content.warmup ? (
        <div className="border-l-4 border-[var(--brand)] bg-[var(--brand-soft)]/50 px-4 py-3">
          <p className="font-medium">{content.warmup.questionVi}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {content.warmup.tipsVi.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {content.passage ? (
        <article className="space-y-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Đoạn đọc
          </h2>
          <p className="whitespace-pre-wrap leading-relaxed text-[15px]">
            {content.passage}
          </p>
        </article>
      ) : null}

      {content.sections?.map((section) => (
        <section key={section.headingVi} className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            {section.headingVi}
            {section.headingEn ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {section.headingEn}
              </span>
            ) : null}
          </h2>
          <MarkdownContent md={section.contentMd} />
          {section.examplesEn?.length ? (
            <div className="space-y-2">
              {section.examplesEn.map((en) => (
                <ExampleCard key={en} en={en} />
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
