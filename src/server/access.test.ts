import { describe, expect, it } from "vitest";
import { resolveAccess } from "./access";

describe("resolveAccess", () => {
  it("allows the first free market-data view of the day", () => {
    expect(
      resolveAccess({
        currentViews: 0,
        hasActiveEntitlement: false,
        nowIso: "2026-06-24T12:00:00.000Z"
      })
    ).toEqual({
      allowed: true,
      shouldIncrementUsage: true,
      reason: "free-daily-view"
    });
  });

  it("locks after the free daily view without entitlement", () => {
    expect(
      resolveAccess({
        currentViews: 1,
        hasActiveEntitlement: false,
        nowIso: "2026-06-24T12:00:00.000Z"
      })
    ).toEqual({
      allowed: false,
      shouldIncrementUsage: false,
      reason: "pro-required"
    });
  });

  it("supports a configurable two-view free limit", () => {
    expect(
      resolveAccess({
        currentViews: 1,
        hasActiveEntitlement: false,
        nowIso: "2026-06-24T12:00:00.000Z",
        freeViewLimit: 2
      }).allowed
    ).toBe(true);
    expect(
      resolveAccess({
        currentViews: 2,
        hasActiveEntitlement: false,
        nowIso: "2026-06-24T12:00:00.000Z",
        freeViewLimit: 2
      }).allowed
    ).toBe(false);
  });

  it("allows active Pro users without consuming free usage", () => {
    expect(
      resolveAccess({
        currentViews: 7,
        hasActiveEntitlement: true,
        nowIso: "2026-06-24T12:00:00.000Z"
      })
    ).toEqual({
      allowed: true,
      shouldIncrementUsage: false,
      reason: "active-pro"
    });
  });
});
