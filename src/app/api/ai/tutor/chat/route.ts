import { streamText } from "ai";
import { TutorRole } from "@prisma/client";
import { z } from "zod";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  PLACEMENT_MODEL,
  getOpenAIProvider,
  hashPrompt,
  hasOpenAIKey,
} from "@/lib/ai/openai";
import { buildTutorSystemPrompt } from "@/lib/ai/prompts";
import {
  getOrCreateConversation,
  listConversationMessages,
  logTutorFeedback,
  saveTutorMessage,
  toModelMessages,
} from "@/lib/ai/tutor";

export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.string().optional().nullable(),
  lessonId: z.string().optional().nullable(),
  message: z.string().min(1).max(4000).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
        parts: z
          .array(
            z.object({
              type: z.string(),
              text: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),
  id: z.string().optional(),
});

function extractLatestUserText(body: z.infer<typeof bodySchema>): string | null {
  if (body.message?.trim()) return body.message.trim();
  if (body.messages?.length) {
    for (let i = body.messages.length - 1; i >= 0; i--) {
      const m = body.messages[i]!;
      if (m.role !== "user") continue;
      if (m.content?.trim()) return m.content.trim();
      const textPart = m.parts?.find((p) => p.type === "text" && p.text);
      if (textPart?.text?.trim()) return textPart.text.trim();
    }
  }
  return null;
}

export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const limited = await enforceRateLimit(user.id, "tutor-chat", 30);
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("Dữ liệu không hợp lệ.");
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }

  const userText = extractLatestUserText(parsed.data);
  if (!userText) {
    return jsonError("Tin nhắn trống.");
  }

  const profile = user.profile;
  const level = profile?.currentLevel ?? 1;
  const weakSkills = (profile?.weakSkills ?? []).map(String);

  let lessonTitle: string | undefined;
  let lessonObjective: string | undefined;
  if (parsed.data.lessonId) {
    const lesson = await prisma.lesson.findFirst({
      where: { id: parsed.data.lessonId, publishedAt: { not: null } },
    });
    if (lesson) {
      lessonTitle = lesson.titleVi;
      const content =
        lesson.contentJson && typeof lesson.contentJson === "object"
          ? (lesson.contentJson as Record<string, unknown>)
          : {};
      if (typeof content.objectiveVi === "string") {
        lessonObjective = content.objectiveVi;
      }
    }
  }

  const conversation = await getOrCreateConversation({
    userId: user.id,
    conversationId: parsed.data.conversationId,
    lessonId: parsed.data.lessonId,
    title: lessonTitle ? `Tutor · ${lessonTitle}` : "Trò chuyện với Tutor",
  });

  await saveTutorMessage({
    conversationId: conversation.id,
    role: TutorRole.USER,
    content: userText,
  });

  const history = await listConversationMessages(conversation.id);
  const modelMessages = toModelMessages(history);
  const system = buildTutorSystemPrompt({
    level,
    weakSkills,
    nativeLang: profile?.nativeLanguage ?? "vi",
    lessonTitle,
    lessonObjective,
  });
  const promptHash = hashPrompt(system + "\n" + userText);

  if (!hasOpenAIKey()) {
    const fallback = [
      `**Gợi ý nhanh (chế độ offline)**`,
      ``,
      `Bạn đang ở Level ${level}/9. Với câu hỏi: “${userText.slice(0, 120)}”`,
      ``,
      `Hãy thử:`,
      `1. Viết lại ý chính bằng 1 câu tiếng Anh ngắn.`,
      `2. So sánh với ví dụ trong bài học.`,
      `3. Hỏi lại Tutor khi đã cấu hình OPENAI_API_KEY.`,
    ].join("\n");

    await saveTutorMessage({
      conversationId: conversation.id,
      role: TutorRole.ASSISTANT,
      content: fallback,
    });
    await logTutorFeedback({
      userId: user.id,
      conversationId: conversation.id,
      promptHash,
      model: "offline-fallback",
      response: fallback,
    });

    return new Response(fallback, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Conversation-Id": conversation.id,
      },
    });
  }

  try {
    const openai = getOpenAIProvider();
    const result = streamText({
      model: openai(PLACEMENT_MODEL),
      system,
      messages: modelMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.4,
      onFinish: async ({ text, usage }) => {
        const content =
          text.trim() ||
          "Xin lỗi, mình chưa tạo được câu trả lời. Bạn thử hỏi lại nhé.";
        await saveTutorMessage({
          conversationId: conversation.id,
          role: TutorRole.ASSISTANT,
          content,
          tokens: usage?.totalTokens,
        });
        await logTutorFeedback({
          userId: user.id,
          conversationId: conversation.id,
          promptHash,
          model: PLACEMENT_MODEL,
          response: content,
        });
      },
    });

    // Prefer UI message stream for @ai-sdk/react useChat; also expose conversation id.
    const response = result.toUIMessageStreamResponse({
      headers: {
        "X-Conversation-Id": conversation.id,
      },
    });
    return response;
  } catch {
    const fallback =
      "Tutor tạm thời không phản hồi được. Vui lòng thử lại sau ít phút.";
    await saveTutorMessage({
      conversationId: conversation.id,
      role: TutorRole.ASSISTANT,
      content: fallback,
    });
    return jsonError(fallback, 502);
  }
}
