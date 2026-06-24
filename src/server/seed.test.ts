import { describe, expect, it } from "vitest";
import { seedMatches } from "./seed";

describe("seedMatches", () => {
  it("keeps source metadata and finished scores in the server seed", () => {
    const matches = seedMatches();
    const portugal = matches.find((match) => match.id === "2026-06-23-por-uzb");

    expect(portugal).toBeDefined();
    expect(portugal?.result?.home).toBe(5);
    expect(portugal?.result?.away).toBe(0);
    expect(portugal?.sourceAudit.source_name).toContain("FIFA");
    expect(portugal?.sourceAudit.provider).toBe("manual-seed");
    expect(portugal?.sourceAudit.raw_snapshot_hash).toMatch(/^[0-9a-f]{8}$/);
  });
});
