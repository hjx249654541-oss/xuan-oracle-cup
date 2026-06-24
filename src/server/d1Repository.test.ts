import { describe, expect, it } from "vitest";
import { createRepository } from "./repositories";

describe("createRepository", () => {
  it("falls back to seeded data when no D1 binding is provided", () => {
    const repository = createRepository();

    expect(repository.listMatches().length).toBeGreaterThan(0);
    expect(repository.findMatch("2026-06-23-por-uzb")?.result?.home).toBe(5);
  });
});
