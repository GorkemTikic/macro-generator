import { describe, expect, it } from "vitest";
import { buildCitationPack, searchFaqCatalog } from "./faqSearch";

describe("FAQ search", () => {
  it("maps Turkish liquidation terms to official liquidation references", () => {
    const results = searchFaqCatalog("tasfiye", { limit: 8 });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => /liquidation/i.test(result.entry.title))).toBe(true);
    expect(results[0].entry.confidence).toBe("high");
  });

  it("maps Chinese error-code terms to developer references", () => {
    const results = searchFaqCatalog("错误码", { limit: 8 });

    expect(results.some((result) => /error codes/i.test(result.entry.title))).toBe(true);
    expect(results.some((result) => result.entry.source === "Developer Docs")).toBe(true);
  });

  it("finds STP user and API references", () => {
    const results = searchFaqCatalog("STP", { limit: 8 });
    const titles = results.map((result) => result.entry.title).join(" ");

    expect(titles).toMatch(/Self Trade Prevention|STP/i);
    expect(results.some((result) => result.entry.priority === "P0")).toBe(true);
  });

  it("builds a citation pack with official URLs", () => {
    const results = searchFaqCatalog("funding", { priority: "P0", limit: 3 });
    const pack = buildCitationPack(results, "funding");

    expect(pack).toContain("Official Binance references");
    expect(pack).toContain("https://");
    expect(pack).toContain("Priority: P0");
  });
});
