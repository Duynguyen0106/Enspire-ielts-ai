import type { Plan, UsagePeriod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  FEATURES,
  type FeatureKey,
} from "@/lib/feature-matrix";

export type { FeatureKey };
export { FEATURES };

export type CanUseResult = {
  allowed: boolean;
  remaining: number | null;
  reason?: string;
  plan: Plan;
};

function periodBounds(period: UsagePeriod, now = new Date()) {
  const start = new Date(now);
  const end = new Date(now);
  if (period === "DAY") {
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
  } else if (period === "WEEK") {
    const day = start.getUTCDay();
    const diff = (day + 6) % 7;
    start.setUTCDate(start.getUTCDate() - diff);
    start.setUTCHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
  } else if (period === "MONTH") {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
    end.setUTCHours(23, 59, 59, 999);
  } else {
    start.setTime(0);
    end.setUTCFullYear(9999, 11, 31);
  }
  return { periodStart: start, periodEnd: end };
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return "FREE";
  if (
    sub.plan === "PRO" &&
    (sub.status === "active" || sub.status === "trialing")
  ) {
    return "PRO";
  }
  return "FREE";
}

function levelAllowed(rule: string | number | boolean, level?: number) {
  if (rule === "all" || rule === true) return true;
  if (rule === false) return false;
  if (typeof rule === "string" && rule.startsWith("level<=")) {
    const max = Number(rule.replace("level<=", ""));
    return (level ?? 1) <= max;
  }
  return true;
}

export async function canUse(
  userId: string,
  feature: FeatureKey,
  context?: { level?: number; consume?: boolean }
): Promise<CanUseResult> {
  const plan = await getUserPlan(userId);
  const def = FEATURES[feature];
  const rule = plan === "PRO" ? def.pro : def.free;

  if (typeof rule === "boolean") {
    return {
      allowed: rule,
      remaining: rule ? null : 0,
      plan,
      reason: rule
        ? undefined
        : "Tính năng này dành cho gói Pro. Nâng cấp để tiếp tục.",
    };
  }

  if (typeof rule === "string") {
    const ok = levelAllowed(rule, context?.level);
    return {
      allowed: ok,
      remaining: ok ? null : 0,
      plan,
      reason: ok
        ? undefined
        : "Gói Free chỉ mở Level 1. Nâng cấp Pro để mở tất cả level.",
    };
  }

  const limit = rule;
  const { periodStart, periodEnd } = periodBounds(def.period as UsagePeriod);
  const log = await prisma.usageLog.findUnique({
    where: {
      userId_feature_periodStart: { userId, feature, periodStart },
    },
  });
  const used = log?.count ?? 0;
  const remaining = Math.max(0, limit - used);
  const allowed = remaining > 0;

  if (allowed && context?.consume !== false) {
    await prisma.usageLog.upsert({
      where: {
        userId_feature_periodStart: { userId, feature, periodStart },
      },
      update: { count: { increment: 1 } },
      create: {
        userId,
        feature,
        count: 1,
        periodStart,
        periodEnd,
        period: def.period as UsagePeriod,
      },
    });
  }

  return {
    allowed,
    remaining: allowed && context?.consume !== false ? remaining - 1 : remaining,
    plan,
    reason: allowed
      ? undefined
      : `Bạn đã hết lượt trong kỳ này. Nâng cấp Pro để dùng thêm.`,
  };
}

export async function requireEntitlement(
  userId: string,
  feature: FeatureKey,
  context?: { level?: number; consume?: boolean }
) {
  return canUse(userId, feature, {
    ...context,
    consume: context?.consume ?? true,
  });
}

export function entitlementsSummary(plan: Plan) {
  return Object.fromEntries(
    (Object.keys(FEATURES) as FeatureKey[]).map((key) => [
      key,
      plan === "PRO" ? FEATURES[key].pro : FEATURES[key].free,
    ])
  );
}
