import { NextResponse } from "next/server";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { listConversationMessages } from "@/lib/ai/tutor";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const limited = await enforceRateLimit(user.id, "tutor-messages", 100);
  if (limited) return limited;

  const { id } = await context.params;
  const conversation = await prisma.tutorConversation.findFirst({
    where: { id, userId: user.id },
  });
  if (!conversation) {
    return jsonError("Không tìm thấy cuộc trò chuyện.", 404);
  }

  const messages = await listConversationMessages(id);
  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      lessonId: conversation.lessonId,
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
}
