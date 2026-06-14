import {
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  primaryKey,
  unique,
  real,
  pgSchema,
} from "drizzle-orm/pg-core";

// All tables/enums live in the `cav1` Postgres schema (not `public`).
export const cav1 = pgSchema("cav1");

export const auditStatus = cav1.enum("audit_status", [
  "pending",
  "running",
  "done",
  "failed",
]);

export const llmPlatform = cav1.enum("llm_platform", ["chatgpt", "gemini", "perplexity"]);

// Vertical categories supported. Add new ones here as we expand.
export const businessCategory = cav1.enum("business_category", [
  "restaurant",
  "dentist",
  "lawyer",
  "plumber",
  "spa",
]);

export const apiKeyTier = cav1.enum("api_key_tier", [
  "internal",
  "beta",
  "starter",
  "growth",
  "enterprise",
]);

export const businesses = cav1.table(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: businessCategory("category").notNull().default("restaurant"),
    url: text("url"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    phone: text("phone"),
    address: text("address"),
    gbpPlaceId: text("gbp_place_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    citySlugIdx: index("businesses_city_slug_idx").on(t.city, t.slug),
    cityCatIdx: index("businesses_city_cat_idx").on(t.city, t.category),
    urlIdx: index("businesses_url_idx").on(t.url),
  }),
);

export const audits = cav1.table(
  "audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    status: auditStatus("status").notNull().default("pending"),
    score: integer("score"),
    breakdownJson: jsonb("breakdown_json"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index("audits_status_idx").on(t.status),
    businessIdx: index("audits_business_idx").on(t.businessId),
  }),
);

// Query results cached at (city, category, prompt, platform) level — not per business.
// One row covers every business mentioned in that LLM response.
export const queryCache = cav1.table(
  "query_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    category: businessCategory("category").notNull(),
    prompt: text("prompt").notNull(),
    platform: llmPlatform("platform").notNull(),
    responseText: text("response_text").notNull(),
    citationsJson: jsonb("citations_json"),
    businessesMentionedJson: jsonb("businesses_mentioned_json"),
    executedAt: timestamp("executed_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    lookupIdx: index("query_cache_lookup_idx").on(t.city, t.category, t.platform, t.expiresAt),
    promptIdx: index("query_cache_prompt_idx").on(t.city, t.category, t.prompt, t.platform),
  }),
);

export const results = cav1.table(
  "results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    queryCacheId: uuid("query_cache_id")
      .notNull()
      .references(() => queryCache.id),
    targetAppeared: boolean("target_appeared").notNull().default(false),
    targetRank: integer("target_rank"),
    competitorsJson: jsonb("competitors_json"),
  },
  (t) => ({
    auditIdx: index("results_audit_idx").on(t.auditId),
  }),
);

export const rateLimits = cav1.table(
  "rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ip: text("ip").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    ipTimeIdx: index("rate_limits_ip_time_idx").on(t.ip, t.createdAt),
  }),
);

export const emailCaptures = cav1.table(
  "email_captures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    auditId: uuid("audit_id").references(() => audits.id, { onDelete: "set null" }),
    domain: text("domain"), // the domain whose fix plan this lead unlocked, if any
    consentMarketing: boolean("consent_marketing").notNull().default(false),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index("email_captures_email_idx").on(t.email),
  }),
);

export const leaderboardRank = cav1.table(
  "leaderboard_rank",
  {
    city: text("city").notNull(),
    category: businessCategory("category").notNull(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    rank: integer("rank").notNull(),
    lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.city, t.category, t.businessId] }),
    cityCatRankIdx: index("leaderboard_city_cat_rank_idx").on(t.city, t.category, t.rank),
  }),
);

export const prewarmJobs = cav1.table("prewarm_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  city: text("city").notNull(),
  category: businessCategory("category").notNull().default("restaurant"),
  status: text("status").notNull().default("pending"),
  businessesIndexed: integer("businesses_indexed").default(0),
  costCents: integer("cost_cents").default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// API key issuance for Layer 1 (data API to vertical SaaS platforms).
export const apiKeys = cav1.table(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: text("key_prefix").notNull(), // first 8 chars, shown in UI for identification
    ownerEmail: text("owner_email").notNull(),
    ownerOrg: text("owner_org"),
    tier: apiKeyTier("tier").notNull().default("beta"),
    rateLimitPerMin: integer("rate_limit_per_min").notNull().default(60),
    dailySpendCapCents: integer("daily_spend_cap_cents").notNull().default(500),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    prefixIdx: index("api_keys_prefix_idx").on(t.keyPrefix),
  }),
);

// Per-request usage log for billing + abuse detection.
export const apiUsage = cav1.table(
  "api_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    statusCode: integer("status_code").notNull(),
    responseMs: integer("response_ms").notNull(),
    costCents: integer("cost_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    keyTimeIdx: index("api_usage_key_time_idx").on(t.apiKeyId, t.createdAt),
  }),
);

/* ============================================================================
   v2 — leaderboard + auth + monetization (additive; v1 tables above untouched)
   See Planning/launch-monetization.md and Planning/dev-roadmap.md.
   ========================================================================== */

export const ledgerKind = cav1.enum("ledger_kind", ["software", "local"]);

export const subscriptionStatus = cav1.enum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
]);

// Users — created/upserted on Google sign-in (Auth.js JWT sessions, no DB session table).
export const users = cav1.table(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    googleId: text("google_id"),
    name: text("name"),
    imageUrl: text("image_url"),
    paymentCustomerId: text("payment_customer_id"), // Dodo Payments customer id
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => ({
    emailUnq: unique("users_email_unq").on(t.email),
    googleIdUnq: unique("users_google_id_unq").on(t.googleId),
  }),
);

// Leaderboard categories ("best-crm" or "austin/restaurants") — mirrors the frontend ledgers.
export const categories = cav1.table(
  "categories",
  {
    slug: text("slug").primaryKey(),
    title: text("title").notNull(),
    query: text("query").notNull(),
    kind: ledgerKind("kind").notNull().default("software"),
    city: text("city"),
    theme: text("theme"), // browse-by-group label (Marketing / Sales / Dev tools…), LLM-tagged
    // --- tiering / scheduler (Phase 2, Planning/category-discovery.md) ---
    // Cadence is EARNED by volatility: refresh churn × traffic decides the slab.
    tier: text("tier").notNull().default("A"), // S | A | B | C | dormant
    churnScore: real("churn_score"), // 0–1 set-diff of named brands vs previous snapshot
    traffic30d: integer("traffic_30d"), // pageviews, when analytics is wired
    trending: boolean("trending").notNull().default(false), // newsjacked → Tier S + badge
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }), // scheduler picks up what's due
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    kindIdx: index("categories_kind_idx").on(t.kind),
    dueIdx: index("categories_next_run_idx").on(t.nextRunAt),
  }),
);

// Discovered category candidates — the auto-discovery FEEDER for `categories`.
// Harvested (Google autocomplete / ask-AI / listicles), demand-scored, then
// validated by a cheap probe (does AI actually name brands?) before a human/auto
// promote inserts the survivor into `categories`. Staging table: created via direct
// SQL (DB is push-built; do NOT drizzle generate/migrate). See Planning/category-discovery.md.
export const categoryCandidates = cav1.table(
  "category_candidates",
  {
    slug: text("slug").primaryKey(),
    title: text("title").notNull(),
    query: text("query").notNull(),
    source: text("source").notNull(), // autocomplete | ai-suggest | listicle | reddit | manual
    demandScore: real("demand_score"),
    brandsNamed: integer("brands_named"), // distinct brands from the validation probe
    status: text("status").notNull().default("pending"), // pending | probed | promoted | rejected
    probeJson: jsonb("probe_json"), // the probe result (engine + names seen)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    probedAt: timestamp("probed_at", { withTimezone: true }),
    promotedAt: timestamp("promoted_at", { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index("category_candidates_status_idx").on(t.status),
  }),
);

// Every on-site search query — first-party analytics + the discovery demand loop.
// result_count = 0 rows seed category_candidates (source="search"); the full log
// powers top-searches/gaps analytics and trend-onset detection. Written
// fire-and-forget on each search (never blocks the response).
export const searchQueries = cav1.table(
  "search_queries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    query: text("query").notNull(),
    normalized: text("normalized"), // categoryKey(query) — groups variants
    resultCount: integer("result_count").notNull(),
    matchedSlug: text("matched_slug"), // top result, if any
    userId: uuid("user_id"), // nullable until auth lands
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdIdx: index("search_queries_created_idx").on(t.createdAt),
    normIdx: index("search_queries_norm_idx").on(t.normalized),
  }),
);

// Weekly leaderboard snapshot. One row per business per category per week.
// runs = { chatgpt, gemini, perplexity } appearance counts (0–5 each).
export const leaderboardSnapshots = cav1.table(
  "leaderboard_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categorySlug: text("category_slug")
      .notNull()
      .references(() => categories.slug, { onDelete: "cascade" }),
    weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
    businessName: text("business_name").notNull(),
    runs: jsonb("runs").notNull(),
    score: integer("score").notNull(),
    avgRank: real("avg_rank"), // mean position when named (ranking tiebreaker)
    rank: integer("rank").notNull(),
    citationsJson: jsonb("citations_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    snapUnq: unique("snapshots_cat_week_biz_unq").on(t.categorySlug, t.weekStart, t.businessName),
    lookupIdx: index("snapshots_cat_week_rank_idx").on(t.categorySlug, t.weekStart, t.rank),
  }),
);

// Per-domain weekly cache (the lean rule). First check/domain/week runs the
// engines and stores the diagnosis; repeats this week serve this row.
export const domainChecks = cav1.table(
  "domain_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    domain: text("domain").notNull(),
    weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
    status: auditStatus("status").notNull().default("pending"),
    reportJson: jsonb("report_json"), // the free diagnosis (what's missing)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    domainWeekUnq: unique("domain_checks_domain_week_unq").on(t.domain, t.weekStart),
    expiryIdx: index("domain_checks_domain_expiry_idx").on(t.domain, t.expiresAt),
  }),
);

// Per-user check log — enforces the free 1-check-per-week limit (result itself
// is shared via domain_checks).
export const checkRequests = cav1.table(
  "check_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    domainCheckId: uuid("domain_check_id").references(() => domainChecks.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userTimeIdx: index("check_requests_user_time_idx").on(t.userId, t.createdAt),
  }),
);

// Recurring subscriptions (the frequency + depth plan). Provider = Dodo Payments.
export const subscriptions = cav1.table(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    status: subscriptionStatus("status").notNull(),
    productId: text("product_id"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    subIdUnq: unique("subscriptions_provider_sub_unq").on(t.providerSubscriptionId),
    userIdx: index("subscriptions_user_idx").on(t.userId),
  }),
);

// Granular per-run, per-business mention metadata — one row per business named
// in a single engine run. Powers the business detail view ("what each AI said")
// and is aggregated into leaderboard_snapshots.runs.
export const businessMentions = cav1.table(
  "business_mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categorySlug: text("category_slug")
      .notNull()
      .references(() => categories.slug, { onDelete: "cascade" }),
    weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
    businessName: text("business_name").notNull(),
    engine: llmPlatform("engine").notNull(),
    prompt: text("prompt"), // which of the ~20 phrasings produced this
    runIndex: integer("run_index").notNull(), // 0..4
    rank: integer("rank"), // position in that answer
    reason: text("reason"), // the snippet/why the engine gave
    citationsJson: jsonb("citations_json"), // sources on that run
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    lookupIdx: index("business_mentions_lookup_idx").on(t.categorySlug, t.weekStart, t.businessName),
    catWeekEngineIdx: index("business_mentions_cwe_idx").on(t.categorySlug, t.weekStart, t.engine),
  }),
);

// One-time "fix report" unlocks (the depth paywall, single domain). Provider = Dodo Payments.
export const purchases = cav1.table(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    providerPaymentId: text("provider_payment_id"),
    amountCents: integer("amount_cents"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("purchases_user_idx").on(t.userId),
    domainIdx: index("purchases_domain_idx").on(t.domain),
  }),
);
