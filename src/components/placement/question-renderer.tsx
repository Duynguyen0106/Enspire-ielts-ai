"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AudioRecorder } from "@/components/placement/audio-recorder";

export type QuestionContent = {
  prompt?: string;
  options?: string[];
  type?: string;
  passageId?: string;
  audioUrl?: string;
  taskTitle?: string;
  taskPrompt?: string;
  minWords?: number;
  maxWords?: number;
  part?: number | string;
  questions?: string[];
  cueCard?: string;
  prepSeconds?: number;
  speakSeconds?: number;
};

type QuestionRendererProps = {
  questionId: string;
  type: string;
  content: QuestionContent;
  value: unknown;
  onChange: (value: unknown) => void;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function QuestionRenderer({
  questionId,
  type,
  content,
  value,
  onChange,
}: QuestionRendererProps) {
  const record = asRecord(value);
  const answer = String(record.answer ?? "");

  if (type === "mcq" || type === "true_false_ng") {
    const options = content.options ?? ["True", "False", "Not Given"];
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{content.prompt}</legend>
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
            >
              <input
                type="radio"
                name={questionId}
                value={option}
                checked={answer === option}
                onChange={() => onChange({ answer: option })}
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (type === "gap_fill") {
    return (
      <div className="space-y-2">
        <Label htmlFor={questionId}>{content.prompt}</Label>
        <Input
          id={questionId}
          value={answer}
          onChange={(e) => onChange({ answer: e.target.value })}
          placeholder="Nhập câu trả lời bằng tiếng Anh"
        />
      </div>
    );
  }

  if (type === "writing_task") {
    const text = String(record.text ?? "");
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const minWords = content.minWords ?? 200;
    return (
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold">{content.taskTitle ?? "Writing Task"}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {content.taskPrompt}
          </p>
        </div>
        <Label htmlFor={questionId}>Bài viết của bạn</Label>
        <textarea
          id={questionId}
          className="min-h-56 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Write your essay in English…"
        />
        <p
          className={
            words < minWords
              ? "text-sm text-amber-700"
              : "text-sm text-muted-foreground"
          }
          aria-live="polite"
        >
          Số từ: {words} / tối thiểu {minWords}
        </p>
      </div>
    );
  }

  if (type === "speaking_task") {
    const transcript = String(record.transcript ?? "");
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium">Part {content.part}</p>
        {content.cueCard ? (
          <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
            {content.cueCard}
          </pre>
        ) : null}
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {(content.questions ?? []).map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
        <AudioRecorder
          maxSeconds={content.speakSeconds ?? 120}
          onRecorded={({ base64 }) =>
            onChange({
              ...record,
              audioBase64: base64,
              transcript:
                transcript ||
                `[Audio recorded for Part ${content.part}]`,
            })
          }
        />
        <div className="space-y-2">
          <Label htmlFor={`${questionId}-transcript`}>
            Transcript (tuỳ chọn — giúp chấm chính xác hơn nếu Whisper lỗi)
          </Label>
          <textarea
            id={`${questionId}-transcript`}
            className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            value={transcript}
            onChange={(e) =>
              onChange({
                ...record,
                transcript: e.target.value,
              })
            }
            placeholder="Type what you said in English (optional)"
          />
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Loại câu hỏi chưa hỗ trợ: {type}
    </p>
  );
}
