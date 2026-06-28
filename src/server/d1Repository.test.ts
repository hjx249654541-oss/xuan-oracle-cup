import { describe, expect, it } from "vitest";
import { createRepository } from "./repositories";

describe("createRepository", () => {
  it("falls back to seeded data when no D1 binding is provided", () => {
    const repository = createRepository();

    expect(repository.listMatches().length).toBeGreaterThan(0);
    expect(repository.findMatch("2026-06-23-por-uzb")?.result?.home).toBe(5);
  });

  it("uses D1 for market usage when a binding is provided", async () => {
    const statements: string[] = [];
    const db = {
      prepare: (sql: string) => {
        statements.push(sql);
        return {
          bind: () => ({
            first: async () => ({ market_views: 2 }),
            run: async () => ({})
          }),
          first: async () => ({ market_views: 2 }),
          run: async () => ({})
        };
      }
    };
    const repository = createRepository(db);

    await expect(repository.getUsage("visitor:match:m1", "2026-06-28")).resolves.toBe(2);
    await repository.incrementUsage("visitor:match:m1", "2026-06-28");

    expect(statements.join("\n")).toContain("daily_usage");
    expect(statements.join("\n")).toContain("ON CONFLICT");
  });
});
