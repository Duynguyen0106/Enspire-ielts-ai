"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import type { SkillName } from "@prisma/client";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  onboardingSchema,
  profileSettingsSchema,
  registerSchema,
} from "@/lib/zod-schemas";

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function registerAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "Email đã được sử dụng" };
  }

  const passwordHash = await hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
      profile: {
        create: {
          displayName: parsed.data.name,
          targetBand: 6.0,
          currentLevel: 1,
          placementCompleted: false,
          nativeLanguage: "vi",
        },
      },
    },
  });

  try {
    const result = await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });

    if (result?.error) {
      return {
        success: false,
        error: "Đăng ký thành công nhưng đăng nhập thất bại",
      };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: "Đăng ký thành công nhưng đăng nhập thất bại",
      };
    }
    throw error;
  }

  redirect("/onboarding");
}

export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { success: false, error: "Email hoặc mật khẩu không đúng" };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Email hoặc mật khẩu không đúng" };
    }
    throw error;
  }

  redirect(callbackUrl.startsWith("/") ? callbackUrl : "/dashboard");
}

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/onboarding" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function completeOnboardingAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const weakSkillsRaw = formData.getAll("weakSkills").map(String);
  const parsed = onboardingSchema.safeParse({
    displayName: formData.get("displayName"),
    targetBand: formData.get("targetBand"),
    weakSkills: weakSkillsRaw,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      displayName: parsed.data.displayName,
      targetBand: parsed.data.targetBand,
      weakSkills: parsed.data.weakSkills as SkillName[],
    },
    create: {
      userId: user.id,
      displayName: parsed.data.displayName,
      targetBand: parsed.data.targetBand,
      weakSkills: parsed.data.weakSkills as SkillName[],
      nativeLanguage: "vi",
      currentLevel: 1,
      placementCompleted: false,
    },
  });

  redirect("/dashboard");
}

export async function updateProfileAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = profileSettingsSchema.safeParse({
    displayName: formData.get("displayName"),
    targetBand: formData.get("targetBand"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      displayName: parsed.data.displayName,
      targetBand: parsed.data.targetBand,
    },
    create: {
      userId: user.id,
      displayName: parsed.data.displayName,
      targetBand: parsed.data.targetBand,
      nativeLanguage: "vi",
      currentLevel: 1,
      placementCompleted: false,
    },
  });

  return { success: true };
}
