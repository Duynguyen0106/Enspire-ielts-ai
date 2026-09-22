import { NextResponse } from "next/server";
import { enforceRateLimit, requireApiUser } from "@/lib/api";
import { listUserConversations } from "@/lib/ai/tutor";

export async function GET() {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const limited = await enforceRateLimit(user.id, "tutor-list", 100);
  if (limited) return limited;

  const conversations = await listUserConversations(user.id);
  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      lessonId: c.lessonId,
      lessonTitleVi: c.lesson?.titleVi ?? null,
      updatedAt: c.updatedAt,
      preview: c.messages[0]?.content?.slice(0, 120) ?? null,
    })),
  });
}
