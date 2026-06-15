CREATE SCHEMA "cav1";
--> statement-breakpoint
CREATE TYPE "cav1"."api_key_tier" AS ENUM('internal', 'beta', 'starter', 'growth', 'enterprise');--> statement-breakpoint
CREATE TYPE "cav1"."audit_status" AS ENUM('pending', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "cav1"."business_category" AS ENUM('restaurant', 'dentist', 'lawyer', 'plumber', 'spa');--> statement-breakpoint
CREATE TYPE "cav1"."ledger_kind" AS ENUM('software', 'local');--> statement-breakpoint
CREATE TYPE "cav1"."llm_platform" AS ENUM('chatgpt', 'gemini', 'perplexity');--> statement-breakpoint
CREATE TYPE "cav1"."subscription_status" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'incomplete');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"owner_email" text NOT NULL,
	"owner_org" text,
	"tier" "cav1"."api_key_tier" DEFAULT 'beta' NOT NULL,
	"rate_limit_per_min" integer DEFAULT 60 NOT NULL,
	"daily_spend_cap_cents" integer DEFAULT 500 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."api_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"status_code" integer NOT NULL,
	"response_ms" integer NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"status" "cav1"."audit_status" DEFAULT 'pending' NOT NULL,
	"score" integer,
	"breakdown_json" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."business_mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_slug" text NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"business_name" text NOT NULL,
	"engine" "cav1"."llm_platform" NOT NULL,
	"prompt" text,
	"run_index" integer NOT NULL,
	"rank" integer,
	"reason" text,
	"citations_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" "cav1"."business_category" DEFAULT 'restaurant' NOT NULL,
	"url" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"phone" text,
	"address" text,
	"gbp_place_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"query" text NOT NULL,
	"kind" "cav1"."ledger_kind" DEFAULT 'software' NOT NULL,
	"city" text,
	"theme" text,
	"tier" text DEFAULT 'A' NOT NULL,
	"churn_score" real,
	"traffic_30d" integer,
	"trending" boolean DEFAULT false NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."category_candidates" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"query" text NOT NULL,
	"source" text NOT NULL,
	"demand_score" real,
	"brands_named" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"probe_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"probed_at" timestamp with time zone,
	"promoted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."check_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"domain" text NOT NULL,
	"domain_check_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."domain_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" text NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"status" "cav1"."audit_status" DEFAULT 'pending' NOT NULL,
	"report_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "domain_checks_domain_week_unq" UNIQUE("domain","week_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."email_captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"audit_id" uuid,
	"domain" text,
	"consent_marketing" boolean DEFAULT false NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."leaderboard_rank" (
	"city" text NOT NULL,
	"category" "cav1"."business_category" NOT NULL,
	"business_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"rank" integer NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_rank_city_category_business_id_pk" PRIMARY KEY("city","category","business_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."leaderboard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_slug" text NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"business_name" text NOT NULL,
	"runs" jsonb NOT NULL,
	"score" integer NOT NULL,
	"avg_rank" real,
	"rank" integer NOT NULL,
	"citations_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "snapshots_cat_week_biz_unq" UNIQUE("category_slug","week_start","business_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."prewarm_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city" text NOT NULL,
	"category" "cav1"."business_category" DEFAULT 'restaurant' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"businesses_indexed" integer DEFAULT 0,
	"cost_cents" integer DEFAULT 0,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"provider_payment_id" text,
	"amount_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."query_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"category" "cav1"."business_category" NOT NULL,
	"prompt" text NOT NULL,
	"platform" "cav1"."llm_platform" NOT NULL,
	"response_text" text NOT NULL,
	"citations_json" jsonb,
	"businesses_mentioned_json" jsonb,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"query_cache_id" uuid NOT NULL,
	"target_appeared" boolean DEFAULT false NOT NULL,
	"target_rank" integer,
	"competitors_json" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."search_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"normalized" text,
	"result_count" integer NOT NULL,
	"matched_slug" text,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"provider_customer_id" text NOT NULL,
	"status" "cav1"."subscription_status" NOT NULL,
	"product_id" text,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_provider_sub_unq" UNIQUE("provider_subscription_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."trend_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term" text NOT NULL,
	"normalized" text NOT NULL,
	"source" text NOT NULL,
	"score" real,
	"status" text DEFAULT 'detected' NOT NULL,
	"kind" text,
	"resolved_slug" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cav1"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"google_id" text,
	"name" text,
	"image_url" text,
	"payment_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_email_unq" UNIQUE("email"),
	CONSTRAINT "users_google_id_unq" UNIQUE("google_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cav1"."api_usage" ADD CONSTRAINT "api_usage_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "cav1"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cav1"."audits" ADD CONSTRAINT "audits_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "cav1"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cav1"."business_mentions" ADD CONSTRAINT "business_mentions_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "cav1"."categories"("slug") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cav1"."check_requests" ADD CONSTRAINT "check_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "cav1"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cav1"."check_requests" ADD CONSTRAINT "check_requests_domain_check_id_domain_checks_id_fk" FOREIGN KEY ("domain_check_id") REFERENCES "cav1"."domain_checks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cav1"."email_captures" ADD CONSTRAINT "email_captures_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "cav1"."audits"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cav1"."leaderboard_rank" ADD CONSTRAINT "leaderboard_rank_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "cav1"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cav1"."leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "cav1"."categories"("slug") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cav1"."purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "cav1"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cav1"."results" ADD CONSTRAINT "results_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "cav1"."audits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cav1"."results" ADD CONSTRAINT "results_query_cache_id_query_cache_id_fk" FOREIGN KEY ("query_cache_id") REFERENCES "cav1"."query_cache"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cav1"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "cav1"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_prefix_idx" ON "cav1"."api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_usage_key_time_idx" ON "cav1"."api_usage" USING btree ("api_key_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audits_status_idx" ON "cav1"."audits" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audits_business_idx" ON "cav1"."audits" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_mentions_lookup_idx" ON "cav1"."business_mentions" USING btree ("category_slug","week_start","business_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_mentions_cwe_idx" ON "cav1"."business_mentions" USING btree ("category_slug","week_start","engine");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_city_slug_idx" ON "cav1"."businesses" USING btree ("city","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_city_cat_idx" ON "cav1"."businesses" USING btree ("city","category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_url_idx" ON "cav1"."businesses" USING btree ("url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_kind_idx" ON "cav1"."categories" USING btree ("kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_next_run_idx" ON "cav1"."categories" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "category_candidates_status_idx" ON "cav1"."category_candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "check_requests_user_time_idx" ON "cav1"."check_requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "domain_checks_domain_expiry_idx" ON "cav1"."domain_checks" USING btree ("domain","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_captures_email_idx" ON "cav1"."email_captures" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leaderboard_city_cat_rank_idx" ON "cav1"."leaderboard_rank" USING btree ("city","category","rank");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "snapshots_cat_week_rank_idx" ON "cav1"."leaderboard_snapshots" USING btree ("category_slug","week_start","rank");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_user_idx" ON "cav1"."purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_domain_idx" ON "cav1"."purchases" USING btree ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "query_cache_lookup_idx" ON "cav1"."query_cache" USING btree ("city","category","platform","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "query_cache_prompt_idx" ON "cav1"."query_cache" USING btree ("city","category","prompt","platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limits_ip_time_idx" ON "cav1"."rate_limits" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "results_audit_idx" ON "cav1"."results" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_queries_created_idx" ON "cav1"."search_queries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_queries_norm_idx" ON "cav1"."search_queries" USING btree ("normalized");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_user_idx" ON "cav1"."subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trend_signals_norm_idx" ON "cav1"."trend_signals" USING btree ("normalized");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trend_signals_status_idx" ON "cav1"."trend_signals" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trend_signals_created_idx" ON "cav1"."trend_signals" USING btree ("created_at");