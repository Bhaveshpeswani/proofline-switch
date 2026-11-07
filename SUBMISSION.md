# Flip the Switch 2026 — submission checklist

**Team:** BuiltByBhavesh · **Project:** Proofline — Evidence Before Promises · **Track:** Best Business Workflow

**Deadline:** November 7, 2026 at 11:59 PM IST. Use the [official form](https://www.wemakedevs.org/hackathons/switch/submit).

1. Run `npm test` (six passing tests) and ensure no credentials are in your repository.
2. Create a public GitHub repo named `proofline-switch`, using the full contents of this source folder, excluding ignored private runtime state. GitHub → New repository → Public → **do not initialize with a separate README**.
3. Record/upload an MP4 shorter than 3:00 to YouTube or Loom (Public/Unlisted). Make sure the link opens in an incognito browser window. If using the illustrated backend video, do **not** claim it is a live Mattermost agent recording; the form explicitly requests live agent working in team chat for Tracks 1/2.
4. Put the actual video URL in `README.md` (replace the placeholder) and push the update.
5. Fill out the form (fields listed below); submit it and confirm it was accepted. Filling the form is not the same as pressing **Submit**.
6. Stop your Switch agent sessions, stop local Switch server, and stop `node server.mjs`.

## Exact Windows Git commands

Run PowerShell inside the folder containing this README and `server.mjs`:

```powershell
npm test
git init
git add .
git status
```

Read the staged file list. Make sure `data/workspace.json`, `.env`, `.codex/`, `.switch/`, auth files, PINs and logs **are absent**. If unsure, stop before committing.

```powershell
git commit -m "Submit Proofline verified workflow"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/proofline-switch.git
git push -u origin main
```

Replace `YOUR_USERNAME`. If your repo already has a remote, use `git remote -v` to inspect rather than adding a duplicate. GitHub sign-in may open in your browser; do not share credentials.

## Exact form fields

- **Project title:** `Proofline — Evidence Before Promises`
- **Tracks:** `Best Business Workflow`
- **Project description:** A local evidence-backed marketing approval system. A deterministic Node.js backend blocks false shipping, stock and returns claims, prepares evidence receipts and requires human manager approval. A public announcement is automatically withheld if its facts become invalid. Switch and Mattermost were configured with a Codex agent that successfully executed some real business tool calls; later sessions were interrupted by a revoked login token. The video illustrates the verified backend workflow with fictional operational data.
- **GitHub:** the URL of your real public `proofline-switch` repository.
- **Video:** the real YouTube or Loom URL, less than 3 minutes, public or unlisted.
- **Live demo:** blank, because the app is local-only.
- **How did you use Switch?:** I ran Switch locally with its bundled Mattermost and a Codex CLI agent named `proofline-agent` in `#proofline-review`. From chat, the agent could use the `tool.mjs` business interface to inspect fictional delivery, stock and returns evidence. We observed real tool calls and also integration issues with working directory and revoked Codex OAuth. The separate Proofline backend enforces verification and reserves publication for manager PIN approval.
- **What did you like / improve?:** Switch made it possible to bring a coding agent into a real team conversation without writing a chat bot. I liked the room/agent and permission model. Windows executable discovery, agent working-directory clarity, OAuth-refresh recovery and explicit per-agent usage ceilings would make the onboarding much more dependable.
- **Optional tracks, PRs, blog and Wispr:** leave blank if not applicable. Don't claim Wispr usage or a Switch core pull request if none exists.

## Final verification

- [ ] Public repo loads, and README images/links work.
- [ ] Six tests pass when cloned.
- [ ] Video link works in private/incognito browser.
- [ ] The form states the truth about illustrated video and partial Switch integration.
- [ ] Submission confirmation page/receipt received before deadline.
