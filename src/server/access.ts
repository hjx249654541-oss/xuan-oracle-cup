export type AccessInput = {
  currentViews: number;
  hasActiveEntitlement: boolean;
  nowIso: string;
  freeViewLimit?: number;
};

export type AccessDecision = {
  allowed: boolean;
  shouldIncrementUsage: boolean;
  reason: "active-pro" | "free-daily-view" | "pro-required";
};

export function resolveAccess(input: AccessInput): AccessDecision {
  if (input.hasActiveEntitlement) {
    return { allowed: true, shouldIncrementUsage: false, reason: "active-pro" };
  }

  if (input.currentViews < (input.freeViewLimit ?? 1)) {
    return { allowed: true, shouldIncrementUsage: true, reason: "free-daily-view" };
  }

  return { allowed: false, shouldIncrementUsage: false, reason: "pro-required" };
}

export function usageDateFromIso(nowIso: string) {
  return nowIso.slice(0, 10);
}
