import { redirect, notFound } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== ("ADMIN" satisfies Role)) {
    notFound();
  }
  return user;
}

export async function requireOnboardedUser() {
  const user = await requireUser();
  if (!user.profile?.displayName || !user.profile.targetBand) {
    redirect("/onboarding");
  }
  return user;
}
