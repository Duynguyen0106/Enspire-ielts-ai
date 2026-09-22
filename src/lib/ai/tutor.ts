import { TutorRole, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getOrCreateConversation(input: {
  userId: string;
  conversationId?: string | null;
  lessonId?: string | null;
  title?: string;
}) {
  if (input.conversationId) {
    const existing = await prisma.tutorConversation.findFirst({
      where: { id: input.conversationId, userId: input.userId },
    });
    if (existing) return existing;
  }

  if (input.lessonId) {
    const byLesson = await prisma.tutorConversation.findFirst({
      where: { userId: input.userId, lessonId: input.lessonId },
      orderBy: { updatedAt: "desc" },
    });
    if (byLesson) return byLesson;
  }

  return prisma.tutorConversation.create({
    data: {
      userId: input.userId,
      lessonId: input.lessonId ?? null,
      title: input.title ?? "Trò chuyện với Tutor",
    },
  });
}

export async function saveTutorMessage(input: {
  conversationId: string;
  role: TutorRole;
  content: string;
  tokens?: number;
}) {
  const message = await prisma.tutorMessage.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      tokens: input.tokens,
    },
  });
  await prisma.tutorConversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });
  return message;
}

export async function listConversationMessages(conversationId: string) {
  return prisma.tutorMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function listUserConversations(userId: string) {
  return prisma.tutorConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      lesson: { select: { id: true, titleVi: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true },
      },
    },
  });
}

export type ChatHistoryItem = {
  role: "user" | "assistant" | "system";
  content: string;
};

export function toModelMessages(
  messages: { role: TutorRole; content: string }[]
): ChatHistoryItem[] {
  return messages
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    }));
}

export async function logTutorFeedback(input: {
  userId: string;
  conversationId: string;
  promptHash: string;
  model: string;
  response: string;
}) {
  await prisma.aIFeedback.create({
    data: {
      userId: input.userId,
      kind: "tutor_chat",
      model: input.model,
      promptHash: input.promptHash,
      responseJson: {
        conversationId: input.conversationId,
        preview: input.response.slice(0, 500),
      } as Prisma.InputJsonValue,
    },
  });
}
