import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";

export const auditStatus = pgEnum("audit_status", [
  "pending",
  "running",
  "done",
  "failed",
]);

export const llmPlatform = pgEnum("llm_platform", ["chatgpt", "gemini"]);

// Vertical categories supported. Add new ones here as we expand.
export const businessCategory = pgEnum("business_category", [
  "restaurant",
  "dentist",
  "lawyer",
  "plumber",
  "spa",
]);

export const apiKeyTier = pgEnum("api_key_tier", [
  "internal",
  "beta",
  "starter",
  "growth",
  "enterprise",
]);

export const businesses = pgTable(
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

export const audits = pgTable(
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
export const queryCache = pgTable(
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

export const results = pgTable(
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

export const rateLimits = pgTable(
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

export const emailCaptures = pgTable(
  "email_captures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    auditId: uuid("audit_id").references(() => audits.id, { onDelete: "set null" }),
    consentMarketing: boolean("consent_marketing").notNull().default(false),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index("email_captures_email_idx").on(t.email),
  }),
);

export const leaderboardRank = pgTable(
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

export const prewarmJobs = pgTable("prewarm_jobs", {
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
export const apiKeys = pgTable(
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
export const apiUsage = pgTable(
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
