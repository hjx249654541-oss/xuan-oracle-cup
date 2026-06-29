import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const siteUrl = "https://xuan-oracle-cup.hjx249654541.workers.dev/";
const shareImageUrl = `${siteUrl}share-card.png`;

describe("share metadata", () => {
  it("exposes WeChat-friendly card metadata with absolute public URLs", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain(`<link rel="canonical" href="${siteUrl}" />`);
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain('<meta property="og:title" content="玄球 Oracle｜世界杯多术法测算" />');
    expect(html).toContain('<meta property="og:description"');
    expect(html).toContain(`<meta property="og:url" content="${siteUrl}" />`);
    expect(html).toContain(`<meta property="og:image" content="${shareImageUrl}" />`);
    expect(html).toContain('<meta property="og:image:width" content="1200" />');
    expect(html).toContain('<meta property="og:image:height" content="630" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toContain(`<meta name="twitter:image" content="${shareImageUrl}" />`);
  });

  it("ships a 1200 by 630 PNG share image", () => {
    const image = readFileSync(resolve(process.cwd(), "public/share-card.png"));

    expect(image.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
  });
});
