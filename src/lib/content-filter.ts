import type { ContentReviewStatus, Role } from "@prisma/client";

/** Student-facing content: only APPROVED (admins may see pending). */
export function studentVisibleReview(
  isAdmin: boolean
): ContentReviewStatus | { in: ContentReviewStatus[] } {
  if (isAdmin) {
    return { in: ["PENDING", "APPROVED", "NEEDS_EDIT"] };
  }
  return "APPROVED";
}

export function isAdminUser(user: { role: Role; email: string | null }) {
  if (user.role === "ADMIN") return true;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(user.email && list.includes(user.email.toLowerCase()));
}
