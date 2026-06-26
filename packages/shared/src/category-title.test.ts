import { describe, it, expect } from "vitest";
import { displayCategoryTitle, displayCategoryNoun } from "./category-title.js";

describe("displayCategoryTitle", () => {
  it.each([
    ["best crm", "Best CRM"],
    ["Best Crm", "Best CRM"],
    ["BEST CRM", "Best CRM"],
    ["best ai coding assistant", "Best AI Coding Assistant"],
    ["best ui ux design tool", "Best UI UX Design Tool"],
    ["best vpn for china", "Best VPN for China"],
    ["best vs code extension", "Best VS Code Extension"],
    ["best b2b crm", "Best B2B CRM"],
    ["best api testing tool", "Best API Testing Tool"],
    ["best seo tool", "Best SEO Tool"],
    ["best erp for smb", "Best ERP for SMB"],
    ["Best CRM", "Best CRM"], // idempotent
    // Connectors stay lowercase even when DB-cased title already has them capitalised.
    ["Best AI Tool For Image Generation", "Best AI Tool for Image Generation"],
    ["Best CRM For Small Business", "Best CRM for Small Business"],
    ["Best Project Management Tool With AI", "Best Project Management Tool with AI"],
    ["", ""],
    // Preserve intentional brand casing
    ["best GitHub alternative", "Best GitHub Alternative"],
    ["best iPhone case", "Best iPhone Case"],
    ["best macOS app", "Best macOS App"],
  ])("%s → %s", (input, expected) => {
    expect(displayCategoryTitle(input)).toBe(expected);
  });
});

describe("displayCategoryNoun", () => {
  it.each([
    ["Best CRM", "CRM"],
    ["best crm", "CRM"],
    ["Best AI Coding Assistant", "AI Coding Assistant"],
    ["Best UI UX Design Tool", "UI UX Design Tool"],
    ["Best GitHub Alternative", "GitHub Alternative"],
  ])("%s → %s", (input, expected) => {
    expect(displayCategoryNoun(input)).toBe(expected);
  });
});
