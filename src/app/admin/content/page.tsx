import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ContentReviewClient } from "@/components/admin/content-review-client";

export const metadata: Metadata = { title: "Content Review" };

export default async function AdminContentPage() {
  const reviews = await prisma.contentReview.findMany({
    where: { status: { in: ["PENDING", "NEEDS_EDIT"] } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const lessons = await prisma.lesson.findMany({
    where: { reviewStatus: { in: ["PENDING", "NEEDS_EDIT"] } },
    include: { level: true, skill: true },
    orderBy: { id: "asc" },
    take: 50,
  });

  const items = [
    ...reviews.map((r) => ({
      id: r.id,
      kind: "review" as const,
      refType: r.refType,
      refId: r.refId,
      status: r.status,
      title: `${r.refType} ${r.refId}`,
      body: r.notesVi ?? "",
    })),
    ...lessons.map((l) => ({
      id: l.id,
      kind: "lesson" as const,
      refType: "LESSON" as const,
      refId: l.id,
      status: l.reviewStatus,
      title: `L${l.level.number} ${l.skill.name}: ${l.titleVi}`,
      body: JSON.stringify(l.contentJson)?.slice(0, 500) ?? "",
    })),
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Content Review</h1>
      <ContentReviewClient items={items} />
    </div>
  );
}
