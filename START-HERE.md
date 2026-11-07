# Start Proofline (Windows, no AI required)

1. Install **Node.js 20+** and extract this repository. Open the folder containing `server.mjs` in File Explorer. Type `powershell` in the address bar and press Enter.
2. Run `node .\server.mjs`. Keep this window open. The terminal prints `MANAGER PIN (keep private)`.
3. Open **http://127.0.0.1:4173/** (dashboard) and **http://127.0.0.1:4173/live** (public page).
4. Open a **second PowerShell** window in this same project folder. Run:

```powershell
node .\tool.mjs inbox
node .\tool.mjs facts
npm test
```

The default fictional values are Berlin `2` business days, AURORA `0` units, and returns `30` calendar days.

## Demonstrate the exact rejection / approval / withdrawal workflow

Reset the workspace in the browser dashboard (footer → **Reset workspace**, enter manager PIN). Then, in your **second** PowerShell window:

```powershell
node .\tool.mjs add PL-1000 delivery Berlin 1
node .\tool.mjs add PL-1000 stock AURORA 1
node .\tool.mjs add PL-1000 returns policy 30
node .\tool.mjs case PL-1000
node .\tool.mjs submit PL-1000
```

The last step **must fail**: one-day delivery conflicts with 2 days, and AURORA stock is 0. The command exits non-zero. This is an expected guardrail, not a broken app.

Inspect the claim IDs with `node .\tool.mjs case PL-1000`. After a fresh reset they are normally C1 (delivery), C2 (stock), C3 (returns).

```powershell
node .\tool.mjs revise PL-1000 C1 2
node .\tool.mjs remove PL-1000 C2
node .\tool.mjs submit PL-1000
```

The case becomes `AWAITING_APPROVAL`. In the manager dashboard, choose PL-1000, enter the **PIN printed in the first terminal**, then click **Approve & publish**.

On `/live`, the public page shows verified delivery and returns claims. Next, in dashboard **03 / SOURCES OF TRUTH**, select `Delivery estimate → Berlin`, enter `4`, click **Update evidence**, and authorize with the PIN. `/live` becomes `WITHHELD` automatically (it refreshes around every four seconds). See **04 / CHAIN OF CUSTODY** for the events.

To repeat: use **Reset workspace** with your manager PIN. This resets demo data, not Switch/Mattermost chat. If you accidentally start two servers, the second reports `EADDRINUSE`; stop the older instance first.

## Optional Switch + Codex chat connection

The original hackathon workflow used Switch Console + a locally running Mattermost room + Codex CLI logged in with ChatGPT. See [SWITCH-SETUP.md](SWITCH-SETUP.md) for the detailed reconstruction. The backend and tests do **not** need Codex, Switch, Ollama or any paid API. A revoked Codex session will stop chat-based tool execution, not the backend. The supplied application demo does not claim to show a complete live Mattermost run.
