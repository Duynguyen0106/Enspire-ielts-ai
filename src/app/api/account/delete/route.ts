import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
