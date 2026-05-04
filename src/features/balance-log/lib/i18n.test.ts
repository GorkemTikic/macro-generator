// Regression guard: every translation string in TEXTS must be free of
// replacement characters (U+FFFD), classic cp1252-as-utf8 mojibake, and
// stray control characters. If any future paste-from-Word or copy/paste
// reintroduces broken encoding, this test fails fast.
import { describe, it, expect } from "vitest";
import { TEXTS, LANG_CONFIG, type LocalLang } from "./i18n";

const MOJIBAKE_PATTERNS = [
  /�/, // replacement char
  /Ã[©¨ ¢®¶¨§]/, // common cp1252-as-utf8 mojibake markers
  /â€[™œž“–—˜]/,
  /Â[ °§]/
];

function isClean(s: string): { ok: true } | { ok: false; reason: string } {
  for (const re of MOJIBAKE_PATTERNS) {
    if (re.test(s)) return { ok: false, reason: `mojibake match: ${re}` };
  }
  for (const ch of s) {
    if (ch === "\n" || ch === "\r" || ch === "\t") continue;
    const code = ch.codePointAt(0)!;
    if (code < 0x20 || code === 0x7f) {
      return { ok: false, reason: `control char U+${code.toString(16)}` };
    }
  }
  return { ok: true };
}

describe("i18n integrity", () => {
  for (const lang of Object.keys(TEXTS) as LocalLang[]) {
    it(`[${lang}] all visible strings are clean UTF-8`, () => {
      const dict = TEXTS[lang] as Record<string, unknown>;
      for (const [key, val] of Object.entries(dict)) {
        if (typeof val !== "string") continue;
        const r = isClean(val);
        expect(r.ok, `${lang}.${key}: ${(r as { reason?: string }).reason ?? ""} — ${JSON.stringify(val)}`).toBe(true);
      }
    });
  }

  it("LANG_CONFIG covers every language in TEXTS", () => {
    const langs = Object.keys(TEXTS) as LocalLang[];
    for (const l of langs) {
      expect(LANG_CONFIG[l]).toBeDefined();
      expect(typeof LANG_CONFIG[l].label).toBe("string");
      expect(typeof LANG_CONFIG[l].offset).toBe("number");
    }
  });

  it("USDⓈ-M is spelled consistently where present", () => {
    // If a translation references the USDⓈ-M product, it must use the
    // U+24C8 form, not "USD-M" / "USDS-M" / "USD$-M".
    const bad = /USD[\s\-_]?M\b/;
    const allow = /USDⓈ-M/;
    for (const lang of Object.keys(TEXTS) as LocalLang[]) {
      const dict = TEXTS[lang] as Record<string, unknown>;
      for (const [key, val] of Object.entries(dict)) {
        if (typeof val !== "string") continue;
        if (bad.test(val) && !allow.test(val)) {
          throw new Error(`${lang}.${key} mentions USD-M without the Ⓢ form: ${JSON.stringify(val)}`);
        }
      }
    }
  });
});
