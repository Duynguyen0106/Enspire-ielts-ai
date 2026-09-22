"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MarkdownContent } from "@/components/lessons/markdown-content";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Giải thích từ này",
  "Cho ví dụ khác",
  "Sửa câu của tôi",
];

type TutorChatProps = {
  lessonId?: string;
  className?: string;
  embedded?: boolean;
};

function messageText(message: {
  role: string;
  parts?: { type: string; text?: string }[];
  content?: string;
}): string {
  if (typeof message.content === "string" && message.content) {
    return message.content;
  }
  const parts = message.parts ?? [];
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text ?? "")
    .join("");
}

function TutorPanel({ lessonId }: { lessonId?: string }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/tutor/chat",
        body: {
          lessonId: lessonId ?? null,
          conversationId,
        },
        prepareSendMessagesRequest: ({ messages, body }) => {
          const last = messages[messages.length - 1];
          const text = messageText(
            last as {
              role: string;
              parts?: { type: string; text?: string }[];
              content?: string;
            }
          );
          return {
            body: {
              ...(body ?? {}),
              lessonId: lessonId ?? null,
              conversationId,
              message: text,
              messages,
            },
          };
        },
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          const cid = res.headers.get("X-Conversation-Id");
          if (cid) setConversationId(cid);
          return res;
        },
      }),
    [lessonId, conversationId]
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
  });

  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    async function loadHistory() {
      try {
        const listRes = await fetch("/api/ai/tutor/conversations");
        if (!listRes.ok) return;
        const list = (await listRes.json()) as {
          conversations: { id: string; lessonId: string | null }[];
        };
        const match = list.conversations.find((c) => c.lessonId === lessonId);
        if (!match || cancelled) return;
        setConversationId(match.id);
        const msgRes = await fetch(
          `/api/ai/tutor/conversations/${match.id}/messages`
        );
        if (!msgRes.ok || cancelled) return;
        const data = (await msgRes.json()) as {
          messages: { id: string; role: string; content: string }[];
        };
        setMessages(
          data.messages
            .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
            .map((m) => ({
              id: m.id,
              role: m.role === "USER" ? "user" : "assistant",
              parts: [{ type: "text" as const, text: m.content }],
            }))
        );
      } catch {
        // ignore history load errors
      }
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [lessonId, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    await sendMessage({ text: trimmed });
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col border bg-card">
      <div className="border-b px-3 py-2">
        <p className="font-medium">AI Tutor</p>
        <p className="text-xs text-muted-foreground">
          Giải thích tiếng Việt · ví dụ tiếng Anh
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Hỏi Tutor bất cứ điều gì về bài học này.
          </p>
        ) : null}
        {messages.map((m) => {
          const text = messageText(m as never);
          if (!text) return null;
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={cn(
                "max-w-[95%] rounded-lg px-3 py-2 text-sm",
                isUser
                  ? "ml-auto bg-[var(--brand)] text-white"
                  : "bg-muted"
              )}
            >
              {isUser ? text : <MarkdownContent md={text} />}
            </div>
          );
        })}
        {busy ? (
          <p className="text-xs text-muted-foreground animate-pulse">
            Tutor đang trả lời…
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>
      <div className="flex flex-wrap gap-1 border-t px-3 py-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => void handleSend(s)}
            className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:border-[var(--brand)]/40 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi…"
          disabled={busy}
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

export function TutorChat({ lessonId, className, embedded }: TutorChatProps) {
  if (embedded) {
    return (
      <div className={cn("h-full", className)}>
        <TutorPanel lessonId={lessonId} />
      </div>
    );
  }

  return (
    <>
      <div className={cn("hidden h-full lg:block", className)}>
        <TutorPanel lessonId={lessonId} />
      </div>
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button
                className="fixed bottom-4 right-4 z-40 shadow-lg"
                size="lg"
              />
            }
          >
            <MessageCircle className="size-4" />
            Hỏi AI
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>AI Tutor</SheetTitle>
            </SheetHeader>
            <TutorPanel lessonId={lessonId} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
