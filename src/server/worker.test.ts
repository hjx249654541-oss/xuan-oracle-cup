import { describe, expect, it } from "vitest";
import worker from "./worker";

describe("worker API", () => {
  it("returns matches with source metadata", async () => {
    const response = await worker.fetch(new Request("https://example.com/api/matches"));
    const body = (await response.json()) as { matches: Array<{ id: string; sourceAudit: { source_name: string } }> };

    expect(response.status).toBe(200);
    expect(body.matches.length).toBeGreaterThan(0);
    expect(body.matches[0].sourceAudit.source_name.length).toBeGreaterThan(0);
  });

  it("returns one free market-data view and then locks the second view", async () => {
    const first = await worker.fetch(
      new Request("https://example.com/api/matches/2026-06-23-por-uzb/odds", {
        headers: { "x-visitor-id": "visitor-a" }
      })
    );
    const second = await worker.fetch(
      new Request("https://example.com/api/matches/2026-06-23-por-uzb/odds", {
        headers: { "x-visitor-id": "visitor-a" }
      })
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(402);
    expect(await second.json()).toEqual({
      error: "pro-required",
      message: "今日免费次数已用完，开通赛事数据 Pro 后可继续查看实时数据、赔率变化和市场热度。"
    });
  });

  it("returns deterministic predictions", async () => {
    const left = await worker.fetch(new Request("https://example.com/api/predictions/2026-06-23-por-uzb?methods=ai,qimen,tarot"));
    const right = await worker.fetch(new Request("https://example.com/api/predictions/2026-06-23-por-uzb?methods=ai,qimen,tarot"));

    expect(await left.json()).toEqual(await right.json());
  });
});
