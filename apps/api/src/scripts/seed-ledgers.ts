import "dotenv/config";
import { getDb, schema, closeDb } from "@cav/db";
import type { Platform } from "../types.js";
import { rankLedger, scoreOf, type LedgerEntryInput } from "../ledger-rank.js";
import { currentWeekStart } from "../domain-check.js";

// Seeds categories + this week's leaderboard_snapshots from the launch sample
// ledgers, so the /ledgers read API returns real rows. Idempotent (upserts).
// Run: pnpm --filter @cav/api seed

type SeedLedger = {
  slug: string;
  title: string;
  query: string;
  kind: "software" | "local";
  city?: string;
  entries: { name: string; runs: Record<Platform, number>; citations: string[] }[];
};

const e = (
  name: string,
  c: number,
  g: number,
  p: number,
  citations: string[],
): SeedLedger["entries"][number] => ({
  name,
  runs: { chatgpt: c, gemini: g, perplexity: p },
  citations,
});

const LEDGERS: SeedLedger[] = [
  {
    slug: "best-crm",
    title: "Best CRM",
    query: "What is the best CRM?",
    kind: "software",
    entries: [
      e("HubSpot", 5, 5, 4, ["g2.com", "reddit.com/r/sales", "zapier.com"]),
      e("Salesforce", 5, 4, 4, ["wikipedia.org", "g2.com", "forbes.com"]),
      e("Pipedrive", 4, 3, 4, ["reddit.com/r/sales", "capterra.com"]),
      e("Zoho CRM", 3, 4, 2, ["techradar.com", "g2.com"]),
      e("Attio", 2, 1, 3, ["reddit.com/r/startups", "producthunt.com"]),
      e("Monday CRM", 2, 2, 1, ["g2.com", "capterra.com"]),
      e("Freshsales", 1, 2, 1, ["techradar.com"]),
      e("Close", 1, 1, 2, ["reddit.com/r/sales"]),
      e("Copper", 1, 1, 1, ["g2.com"]),
      e("Insightly", 0, 1, 1, ["capterra.com"]),
    ],
  },
  {
    slug: "best-ai-coding-tool",
    title: "Best AI coding tool",
    query: "What is the best AI coding assistant?",
    kind: "software",
    entries: [
      e("Cursor", 5, 4, 5, ["reddit.com/r/programming", "news.ycombinator.com"]),
      e("GitHub Copilot", 5, 5, 4, ["github.blog", "wikipedia.org", "stackoverflow.blog"]),
      e("Claude Code", 4, 3, 5, ["news.ycombinator.com", "reddit.com/r/ClaudeAI"]),
      e("Windsurf", 3, 2, 3, ["reddit.com/r/programming", "producthunt.com"]),
      e("Replit", 2, 3, 2, ["techcrunch.com", "g2.com"]),
      e("JetBrains AI", 2, 2, 1, ["jetbrains.com", "reddit.com/r/Kotlin"]),
      e("Tabnine", 1, 2, 1, ["g2.com"]),
      e("Amazon Q Developer", 1, 2, 1, ["aws.amazon.com"]),
      e("Codeium", 1, 1, 1, ["reddit.com/r/programming"]),
      e("Aider", 0, 0, 2, ["news.ycombinator.com"]),
    ],
  },
  {
    slug: "best-email-marketing",
    title: "Best email marketing tool",
    query: "What is the best email marketing tool?",
    kind: "software",
    entries: [
      e("Klaviyo", 5, 4, 4, ["reddit.com/r/ecommerce", "g2.com"]),
      e("Mailchimp", 4, 5, 3, ["wikipedia.org", "pcmag.com"]),
      e("ConvertKit (Kit)", 4, 3, 4, ["reddit.com/r/blogging", "creatoreconomy.so"]),
      e("Brevo", 3, 3, 2, ["techradar.com", "capterra.com"]),
      e("ActiveCampaign", 3, 2, 3, ["g2.com", "capterra.com"]),
      e("beehiiv", 2, 1, 3, ["reddit.com/r/newsletters", "producthunt.com"]),
      e("MailerLite", 2, 2, 1, ["techradar.com"]),
      e("Constant Contact", 1, 2, 1, ["pcmag.com"]),
      e("Omnisend", 1, 1, 1, ["g2.com"]),
      e("Loops", 0, 0, 2, ["news.ycombinator.com"]),
    ],
  },
  {
    slug: "best-note-taking-app",
    title: "Best note-taking app",
    query: "What is the best note-taking app?",
    kind: "software",
    entries: [
      e("Notion", 5, 5, 4, ["reddit.com/r/Notion", "wikipedia.org", "theverge.com"]),
      e("Obsidian", 4, 3, 5, ["reddit.com/r/ObsidianMD", "news.ycombinator.com"]),
      e("Apple Notes", 4, 3, 3, ["reddit.com/r/apple", "macrumors.com"]),
      e("OneNote", 3, 4, 2, ["pcmag.com", "wikipedia.org"]),
      e("Evernote", 3, 3, 2, ["wikipedia.org", "techradar.com"]),
      e("Google Keep", 2, 3, 1, ["pcmag.com"]),
      e("Bear", 2, 1, 2, ["reddit.com/r/bearapp"]),
      e("Roam Research", 1, 1, 2, ["news.ycombinator.com"]),
      e("Logseq", 1, 0, 2, ["reddit.com/r/logseq"]),
      e("Craft", 1, 1, 1, ["producthunt.com"]),
    ],
  },
  {
    slug: "best-project-management",
    title: "Best project management tool",
    query: "What is the best project management tool?",
    kind: "software",
    entries: [
      e("Linear", 4, 3, 5, ["news.ycombinator.com", "reddit.com/r/startups"]),
      e("Asana", 5, 4, 3, ["g2.com", "wikipedia.org"]),
      e("Monday.com", 4, 5, 2, ["g2.com", "capterra.com"]),
      e("Jira", 4, 4, 3, ["wikipedia.org", "reddit.com/r/agile"]),
      e("ClickUp", 3, 3, 3, ["g2.com", "reddit.com/r/productivity"]),
      e("Trello", 3, 3, 2, ["wikipedia.org", "pcmag.com"]),
      e("Basecamp", 2, 2, 2, ["signalvnoise.com", "news.ycombinator.com"]),
      e("Notion Projects", 2, 1, 2, ["reddit.com/r/Notion"]),
      e("Height", 1, 0, 1, ["producthunt.com"]),
      e("Shortcut", 0, 1, 1, ["g2.com"]),
    ],
  },
  {
    slug: "austin/restaurants",
    title: "Best restaurants in Austin",
    query: "What are the best restaurants in Austin?",
    kind: "local",
    city: "Austin, TX",
    entries: [
      e("Franklin Barbecue", 5, 5, 5, ["eater.com", "reddit.com/r/austinfood", "texasmonthly.com"]),
      e("Uchi", 5, 4, 4, ["eater.com", "yelp.com", "michelin.com"]),
      e("Suerte", 4, 4, 4, ["eater.com", "bonappetit.com"]),
      e("Odd Duck", 4, 3, 3, ["reddit.com/r/austinfood", "yelp.com"]),
      e("Loro", 3, 4, 2, ["eater.com", "yelp.com"]),
      e("Veracruz All Natural", 3, 2, 4, ["reddit.com/r/austinfood", "eater.com"]),
      e("Terry Black's BBQ", 3, 3, 2, ["yelp.com", "tripadvisor.com"]),
      e("Matt's El Rancho", 2, 3, 1, ["yelp.com", "texasmonthly.com"]),
      e("Hestia", 2, 1, 2, ["michelin.com", "eater.com"]),
      e("Justine's Brasserie", 1, 1, 1, ["yelp.com"]),
    ],
  },
  {
    slug: "austin/tacos",
    title: "Best tacos in Austin",
    query: "Where are the best tacos in Austin?",
    kind: "local",
    city: "Austin, TX",
    entries: [
      e("Veracruz All Natural", 5, 4, 5, ["reddit.com/r/austinfood", "eater.com", "texasmonthly.com"]),
      e("Suerte", 4, 4, 4, ["eater.com", "bonappetit.com"]),
      e("Valentina's Tex Mex BBQ", 4, 4, 3, ["texasmonthly.com", "reddit.com/r/austinfood"]),
      e("Torchy's Tacos", 4, 5, 2, ["wikipedia.org", "yelp.com"]),
      e("Granny's Tacos", 3, 2, 4, ["reddit.com/r/austinfood", "eater.com"]),
      e("Cuantos Tacos", 3, 2, 3, ["eater.com", "reddit.com/r/austinfood"]),
      e("Nixta Taqueria", 2, 2, 3, ["bonappetit.com", "eater.com"]),
      e("Taquero Mucho", 2, 2, 1, ["yelp.com"]),
      e("De Nada Cantina", 1, 1, 1, ["yelp.com"]),
      e("Discada", 1, 0, 2, ["eater.com"]),
    ],
  },
  {
    slug: "nyc/dentists",
    title: "Best dentists in NYC",
    query: "Who are the best dentists in NYC?",
    kind: "local",
    city: "New York, NY",
    entries: [
      e("Tend Dental", 4, 4, 4, ["yelp.com", "reddit.com/r/AskNYC"]),
      e("NYC Smile Design", 4, 3, 3, ["yelp.com", "realself.com"]),
      e("Park 56 Dental", 3, 4, 2, ["yelp.com", "google.com/maps"]),
      e("Tribeca Dental Studio", 3, 2, 3, ["yelp.com", "zocdoc.com"]),
      e("Dr. Michael Apa", 2, 2, 4, ["nytimes.com", "vogue.com"]),
      e("Gramercy Dental Studio", 2, 2, 2, ["zocdoc.com", "yelp.com"]),
      e("Columbia Dental (clinic)", 2, 3, 1, ["columbia.edu", "reddit.com/r/AskNYC"]),
      e("Smile Arts of NY", 1, 2, 1, ["yelp.com"]),
      e("Village Dental", 1, 1, 1, ["zocdoc.com"]),
      e("285 Madison Dental", 1, 1, 1, ["yelp.com"]),
    ],
  },
];

async function main() {
  const db = getDb();
  const weekStart = currentWeekStart();
  let cats = 0;
  let snaps = 0;

  for (const ledger of LEDGERS) {
    await db
      .insert(schema.categories)
      .values({
        slug: ledger.slug,
        title: ledger.title,
        query: ledger.query,
        kind: ledger.kind,
        city: ledger.city ?? null,
      })
      .onConflictDoUpdate({
        target: schema.categories.slug,
        set: { title: ledger.title, query: ledger.query, kind: ledger.kind, city: ledger.city ?? null },
      });
    cats++;

    const input: LedgerEntryInput[] = ledger.entries.map((x) => ({
      businessName: x.name,
      runs: x.runs,
      citations: x.citations,
    }));
    const ranked = rankLedger(input);

    for (const r of ranked) {
      await db
        .insert(schema.leaderboardSnapshots)
        .values({
          categorySlug: ledger.slug,
          weekStart,
          businessName: r.name,
          runs: r.runs,
          score: scoreOf(r.runs),
          rank: r.rank,
          citationsJson: r.citations,
        })
        .onConflictDoUpdate({
          target: [
            schema.leaderboardSnapshots.categorySlug,
            schema.leaderboardSnapshots.weekStart,
            schema.leaderboardSnapshots.businessName,
          ],
          set: { runs: r.runs, score: scoreOf(r.runs), rank: r.rank, citationsJson: r.citations },
        });
      snaps++;
    }
  }

  console.log(`Seeded ${cats} categories, ${snaps} snapshots for week ${weekStart.toISOString().slice(0, 10)}`);
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
