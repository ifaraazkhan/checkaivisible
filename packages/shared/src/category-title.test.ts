import { describe, it, expect } from "vitest";
import { displayCategoryTitle, displayCategoryNoun, displayCategoryQuery } from "./category-title.js";

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

describe("displayCategoryQuery", () => {
  it.each([
    // Singular head nouns → "What is the best …?"
    ["Best CRM", "What is the best CRM?"],
    ["best crm", "What is the best CRM?"],
    ["Best AI Coding Assistant", "What is the best AI coding assistant?"],
    ["Best Note-Taking App", "What is the best note-taking app?"],
    ["Best Email Marketing Tool", "What is the best email marketing tool?"],
    ["Best Project Management Software", "What is the best project management software?"],
    // Plural head nouns → "What are the best …?"
    ["Best Email Marketing Platforms", "What are the best email marketing platforms?"],
    ["Best AI Tools", "What are the best AI tools?"],
    ["Best CRMs", "What are the best CRMs?"],
    // Qualifier ("for/in/with") doesn't make the head plural.
    ["Best AI Tool for Image Generation", "What is the best AI tool for image generation?"],
    ["Best CRM for Real Estate", "What is the best CRM for real estate?"],
    // -ss/-us/-is endings stay singular.
    ["Best Business Intelligence Software", "What is the best business intelligence software?"],
    ["Best Analysis Tool", "What is the best analysis tool?"],
    // Acronyms ending in S stay singular.
    ["Best CMS", "What is the best CMS?"],
    ["Best SaaS Tool", "What is the best SaaS tool?"],
    ["", ""],
  ])("%s → %s", (input, expected) => {
    expect(displayCategoryQuery(input)).toBe(expected);
  });
});
