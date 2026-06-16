import { PgBoss, type Job } from "pg-boss";
import { getDb, schema, and, eq, gt } from "@cav/db";
import type { Category, LlmResponse, MentionResult, Platform } from "./types.js";
import { PLATFORMS } from "./types.js";
import { generatePrompts } from "./queries.js";
import { ENGINE_BY_PLATFORM } from "./llm/engines.js";
import { extractMentions } from "./llm/parse.js";

// Dispatch table — the shared resilience-wrapped engines, keyed by platform.
const ENGINE: Record<Platform, (prompt: string) => Promise<LlmResponse>> = ENGINE_BY_PLATFORM;
import { detectMention } from "./mention.js";
import { computeScore } from "./score.js";
import { canSpend, getInternalApiKeyId, recordSpend } from "./spend-cap.js";
import { analyzeDomain } from "./readiness/analyze.js";

export const AUDIT_QUEUE = "audit";
export const DOMAIN_CHECK_QUEUE = "domain-check";

let boss: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  boss = new PgBoss({ connectionString, schema: "pgboss" });
  boss.on("error", (err: unknown) => console.error("[pg-boss]", err));
  await boss.start();
  return boss;
}

const CACHE_TTL_DAYS = 7;

async function getCachedOrFetch(
  city: string,
  state: string,
  category: Category,
  prompt: string,
  platform: Platform,
): Promise<{ response: LlmResponse; cacheId: string }> {
  const db = getDb();
  const now = new Date();

  const cached = await db
    .select()
    .from(schema.queryCache)
    .where(
      and(
        eq(schema.queryCache.city, city),
        eq(schema.queryCache.category, category),
        eq(schema.queryCache.prompt, prompt),
        eq(schema.queryCache.platform, platform),
        gt(schema.queryCache.expiresAt, now),
      ),
    )
    .limit(1);

  if (cached[0]) {
    const row = cached[0];
    return {
      cacheId: row.id,
      response: {
        platform,
        prompt,
        responseText: row.responseText,
        citations: (row.citationsJson as string[] | null) ?? [],
        businessesMentioned:
          (row.businessesMentionedJson as string[] | null) ?? [],
        mentions: extractMentions(row.responseText),
      },
    };
  }

  if (!(await canSpend(platform))) {
    throw new Error(`spend_cap_exceeded:${platform}`);
  }

  const t0 = Date.now();
  const response = await ENGINE[platform](prompt);
  const elapsed = Date.now() - t0;

  const apiKeyId = await getInternalApiKeyId();
  await recordSpend(apiKeyId, platform, elapsed, 200).catch((e) =>
    console.error("[spend]", e),
  );

  const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const [inserted] = await db
    .insert(schema.queryCache)
    .values({
      city,
      state,
      category,
      prompt,
      platform,
      responseText: response.responseText,
      citationsJson: response.citations,
      businessesMentionedJson: response.businessesMentioned,
      expiresAt,
    })
    .returning({ id: schema.queryCache.id });

  return { cacheId: inserted!.id, response };
}

export type AuditJobData = { auditId: string };

async function runAudit(data: AuditJobData): Promise<void> {
  const db = getDb();
  const { auditId } = data;

  const [audit] = await db
    .select()
    .from(schema.audits)
    .where(eq(schema.audits.id, auditId))
    .limit(1);
  if (!audit) throw new Error(`audit ${auditId} not found`);

  const [business] = await db
    .select()
    .from(schema.businesses)
    .where(eq(schema.businesses.id, audit.businessId))
    .limit(1);
  if (!business) throw new Error(`business ${audit.businessId} not found`);

  await db
    .update(schema.audits)
    .set({ status: "running" })
    .where(eq(schema.audits.id, auditId));

  const prompts = generatePrompts(business.category, business.city);
  const mentions: MentionResult[] = [];

  for (const prompt of prompts) {
    for (const platform of PLATFORMS) {
      try {
        const { response, cacheId } = await getCachedOrFetch(
          business.city,
          business.state,
          business.category,
          prompt,
          platform,
        );
        const mention = detectMention(business.name, response);
        mentions.push(mention);

        await db.insert(schema.results).values({
          auditId,
          queryCacheId: cacheId,
          targetAppeared: mention.targetAppeared,
          targetRank: mention.targetRank,
          competitorsJson: mention.competitors,
        });
      } catch (err) {
        console.error("[audit:llm]", platform, prompt, err);
        // Skip this (prompt, platform) on failure rather than failing the whole audit.
      }
    }
  }

  const score = computeScore(mentions);

  await db
    .update(schema.audits)
    .set({
      status: "done",
      score: score.overall,
      breakdownJson: score,
      completedAt: new Date(),
    })
    .where(eq(schema.audits.id, auditId));

  // Upsert into leaderboard for the (city, category) pair.
  await db
    .insert(schema.leaderboardRank)
    .values({
      city: business.city,
      category: business.category,
      businessId: business.id,
      score: score.overall,
      rank: 0,
    })
    .onConflictDoUpdate({
      target: [
        schema.leaderboardRank.city,
        schema.leaderboardRank.category,
        schema.leaderboardRank.businessId,
      ],
      set: { score: score.overall, lastUpdated: new Date() },
    });
}

// ---- v2 domain check: the on-page AI-readiness audit -----------------------

export type DomainCheckJobData = { domainCheckId: string; domain: string };

async function runDomainCheck(data: DomainCheckJobData): Promise<void> {
  const db = getDb();
  const { domainCheckId, domain } = data;

  // Live "thinking" log: each analyzer step closes the previous one and appends a
  // new running step. We persist it to report_json while status is "running" so the
  // client can poll and render where the engine is (and where a slow site stalls).
  // Writes are serialized on a single chain and drained before the final report
  // write, so a lagging progress write can never clobber the finished report.
  const steps: { label: string; detail?: string; done: boolean }[] = [];
  let chain: Promise<unknown> = Promise.resolve();
  let lastWrite = 0;
  const flushProgress = () => {
    chain = chain.then(() =>
      db
        .update(schema.domainChecks)
        .set({ reportJson: { progress: { steps } } })
        .where(eq(schema.domainChecks.id, domainCheckId))
        .catch((e) => console.error("[domain-check:progress]", e)),
    );
    return chain;
  };

  const onProgress = (label: string, detail?: string) => {
    if (steps.length) steps[steps.length - 1]!.done = true;
    steps.push({ label, detail, done: false });
    const now = Date.now();
    if (now - lastWrite >= 300) {
      lastWrite = now; // throttle DB writes, but keep every step in the array
      void flushProgress();
    }
  };

  await db
    .update(schema.domainChecks)
    .set({ status: "running", reportJson: { progress: { steps } } })
    .where(eq(schema.domainChecks.id, domainCheckId));

  const report = await analyzeDomain(domain, onProgress);
  if (steps.length) steps[steps.length - 1]!.done = true;

  await chain; // drain any in-flight progress writes before the final report write
  await db
    .update(schema.domainChecks)
    .set({ status: report.meta.fetchOk ? "done" : "failed", reportJson: report })
    .where(eq(schema.domainChecks.id, domainCheckId));
}

export async function startWorker(): Promise<void> {
  const b = await getBoss();
  await b.createQueue(AUDIT_QUEUE);
  await b.createQueue(DOMAIN_CHECK_QUEUE);
  await b.work<AuditJobData>(AUDIT_QUEUE, async (jobs: Job<AuditJobData>[]) => {
    for (const job of jobs) {
      try {
        await runAudit(job.data);
      } catch (err) {
        console.error("[audit:fail]", job.id, err);
        const db = getDb();
        await db
          .update(schema.audits)
          .set({ status: "failed", completedAt: new Date() })
          .where(eq(schema.audits.id, job.data.auditId));
        throw err;
      }
    }
  });
  await b.work<DomainCheckJobData>(
    DOMAIN_CHECK_QUEUE,
    async (jobs: Job<DomainCheckJobData>[]) => {
      for (const job of jobs) {
        try {
          await runDomainCheck(job.data);
        } catch (err) {
          console.error("[domain-check:fail]", job.id, err);
          const db = getDb();
          await db
            .update(schema.domainChecks)
            .set({ status: "failed" })
            .where(eq(schema.domainChecks.id, job.data.domainCheckId));
          throw err;
        }
      }
    },
  );
  console.log(`[worker] listening on queues "${AUDIT_QUEUE}", "${DOMAIN_CHECK_QUEUE}"`);
}

export async function enqueueAudit(auditId: string): Promise<void> {
  const b = await getBoss();
  await b.send(AUDIT_QUEUE, { auditId } satisfies AuditJobData);
}

export async function enqueueDomainCheck(domainCheckId: string, domain: string): Promise<void> {
  const b = await getBoss();
  // If a worker dies mid-job, expire it and retry so the check never gets pinned.
  await b.send(DOMAIN_CHECK_QUEUE, { domainCheckId, domain } satisfies DomainCheckJobData, {
    expireInSeconds: 120,
    retryLimit: 2,
    retryDelay: 5,
  });
}
