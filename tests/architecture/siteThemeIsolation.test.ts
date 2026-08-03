import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("site A2 theme isolation", () => {
  it("loads the product-site theme only from the site layout", () => {
    const siteLayout = read("app/(site)/layout.tsx");
    const rootLayout = read("app/layout.tsx");

    expect(siteLayout).toContain('import "./site-theme.css"');
    expect(siteLayout).toContain('className="site-theme-root"');

    expect(rootLayout).not.toContain("site-theme.css");
    expect(rootLayout).not.toContain("site-theme-root");
  });

  it("scopes product tokens under the site root", () => {
    const theme = read("app/(site)/site-theme.css");

    expect(theme).toContain(".site-theme-root {");
    expect(theme).toContain("--bg: #efeadd");
    expect(theme).toContain("--text-soft: #6b6154");
    expect(theme).toContain("--accent: #a87f3c");
    expect(theme).toContain("--font-display:");
    expect(theme).toContain("--font-body:");

    expect(theme).not.toMatch(/(^|\n)\s*:root\s*\{/);
    expect(theme).not.toMatch(/(^|\n)\s*body\s*\{/);
    expect(theme).not.toContain(".cms-theme-root");
    expect(theme).not.toContain("[data-admin-theme");
  });

  it("uses local next-font variables instead of font CDN imports", () => {
    const rootLayout = read("app/layout.tsx");
    const theme = read("app/(site)/site-theme.css");

    expect(rootLayout).toContain('import { Inter, Lora } from "next/font/google"');
    expect(rootLayout).toContain('weight: ["400", "500", "600", "700"]');
    expect(rootLayout).toContain('weight: ["500", "600", "700"]');

    expect(theme).toContain("var(--font-inter)");
    expect(theme).toContain("var(--font-serif-lora)");

    expect(theme).not.toContain("@import url");
    expect(theme).not.toContain("fonts.googleapis.com");
    expect(theme).not.toContain("fonts.gstatic.com");
  });

  it("preserves the existing admin and cabinet theme definitions", () => {
    const globals = read("app/globals.css");

    expect(globals).toContain(".cms-theme-root");
    expect(globals).toContain('html[data-admin-theme="light"] .cms-theme-root');
    expect(globals).not.toContain(".site-theme-root");
  });

  it("keeps the product site light-only", () => {
    const theme = read("app/(site)/site-theme.css");

    expect(theme).toContain("color-scheme: light");
    expect(theme).not.toContain("prefers-color-scheme");
    expect(theme).not.toContain("data-admin-theme");
  });
});
