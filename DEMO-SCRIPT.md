# Proofline demo guide — what is verified

## Backend-only application demo (reproducible, even offline)

The supplied application walkthrough (2 minutes 24 seconds) illustrates this **actually tested backend sequence**, using entirely fictional operational records. It is **not footage of a fully working real-time Codex/Mattermost agent chat**.

| Moment | Concrete action | Expected outcome |
|---|---|---|
| 1. Claim review | Add Berlin delivery 1; AURORA stock 1; returns 30 | Two BLOCKED, one VERIFIED |
| 2. Correction | Revise Berlin to 2, remove AURORA, submit | `AWAITING_APPROVAL` |
| 3. Human authorization | Dashboard manager PIN → Approve & publish | `/api/public` returns `LIVE` |
| 4. Drift | Update Berlin actual ETA to 4 | `/api/public` returns `WITHHELD` |
| 5. Audit | `node tool.mjs audit` | Events show created/revised/submitted/published/facts.updated |

See [START-HERE.md](START-HERE.md) for exact commands and dashboard clicks. `npm test` independently checks these rules.

## If a reviewer wants to verify Switch collaboration

[SWITCH-SETUP.md](SWITCH-SETUP.md) gives the optional Codex/Mattermost setup. Send an actual chat mention to `@proofline-agent`, verify its tool execution in the Switch session, then perform the same corrections and human manager sign-off. Do not represent agent-generated text as proof of a tool call. The original hackathon attempt was interrupted by a revoked Codex token; no screen capture of the complete live integration is included.

## Two-line explanation

**The AI may investigate and propose; it does not determine business truth or publish.**

**Yesterday's approval cannot make today's false promise true.**
