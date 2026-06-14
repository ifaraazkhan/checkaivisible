// System-prompt strategy for the 5 runs per engine.
//
// Option B: ONE consistent system prompt across all 5 runs — a uniform condition
// so n/5 honestly means "how reliably AI recommends you when asked this way".
// Run-to-run variance comes from model nondeterminism, not from changing the ask.
//
// The "Name — short reason" format gives us two things at once: clean, parseable
// names AND a per-business snippet ("what the AI said") for the detail view.

export const RUNS_PER_ENGINE = 5;

export const SYSTEM_PROMPT =
  "You are a consumer recommendations assistant. Answer the user's question with a numbered list of up to 10 specific, real product or business names, ranked most-recommended first. Format every line exactly as: \"Name — a short reason (max 12 words)\". Use real, specific names only — no categories, no headings, no extra commentary.";

/** Same system prompt for every run (uniform measurement condition). */
export function systemPromptForRun(_runIndex: number): string {
  return SYSTEM_PROMPT;
}
