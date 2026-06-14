# Login flow — dev notes (brief)

Short spec for the auth slice. The free flow (audit + email-gated Tier A fix plan +
glimpses of the two paid features) is already built and works anonymously. Login is
what turns a lead into an account so we can run per-user metered features.

## Why login exists (what it unlocks)
1. **Rank Check** — gated on `aiScore ≥ 60`; **1 free run/week/user**. The weekly
   limit is per-user, so it needs an account to meter.
2. **Personalized AI Fix Report** (Tier B) and **paid plans / quotas** — billing and
   monthly quotas attach to a user.
3. Persistent history (past audits, saved domains, weekly re-check notifications).

## Recommended approach
- **Google OAuth** (matches PRODUCT.md audience: business owners). Needs a Google
  Cloud project → OAuth client ID/secret + consent screen (owner action; we can't
  provision it). Until then, the **email-gate is the MVP stand-in** — already wired
  via `POST /email/capture` and `localStorage["cav_email"]`.
- Session: httpOnly cookie (JWT or server session). On the API, resolve the user and
  set `userId` — the `/check` route already accepts `userId` and enforces
  `FREE_WEEKLY_LIMIT`; the plumbing is there, just unused.

## Flow
1. User hits a gated action (Run rank check / Generate personalized report).
2. Not logged in → `/login` → Google consent → callback creates/looks up the user
   (`cav1.users`), sets the session cookie, returns to the action.
3. Logged in → client sends the session; API resolves `userId` and applies
   per-user gating (weekly rank limit, plan quota for Tier B).

## What to wire (checklist)
- [ ] `/login` + Google OAuth callback; create/find `cav1.users`; session cookie.
- [ ] API middleware: read session → `userId` on the request context.
- [ ] Pass `userId` from web into `checkDomain` / new rank + solution calls.
- [ ] Swap the email-gate unlock for "logged-in" where appropriate (keep email
      capture as the fallback / marketing consent).
- [ ] Rank endpoint (Phase 2): enforce `aiScore ≥ 60` + 1/week/user.
- [ ] Migrate the existing soft `localStorage` unlock to a real session check.

## Out of scope here
Payments/quotas (separate billing slice) and the rank LLM pipeline itself (Phase 2).
This doc is only the identity/session layer.
