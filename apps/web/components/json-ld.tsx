// Server-rendered JSON-LD. Inlining it in the initial HTML (not injecting via JS) is
// what lets AI crawlers — which don't run JavaScript — read our structured data.
// See Planning/free-launch-plan.md §1 (Schema pillar).
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // data is built from static, trusted values — safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
