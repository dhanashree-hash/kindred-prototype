# Kindred

A workshop pairing app that helps people find a creative partner to attend local workshops together. Built in vanilla JavaScript — no framework, no build step, no external dependencies.

> **This project is a GitLab Duo demo.** See [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) for the full walkthrough.

---

## Demo Setup

This repo uses **two branches** to tell a two-phase story:

| Branch | Phase | Pipeline state |
|--------|-------|----------------|
| `main` | Release — clean, passing | ✅ All stages pass |
| `feature/analytics-integration` | Maintenance — issues introduced | 🔴 Fails at security stage |

**To import to GitLab:**
```bash
# Push both branches
git push origin main
git push origin feature/analytics-integration
```
Then open a merge request from `feature/analytics-integration` → `main`.  
The MR pipeline will run and fail at the security stage — that's the intended starting point for Phase 2.

---

## Running the App

Serve the directory with any static file server:

```bash
# Option A — Python
python3 -m http.server 8080

# Option B — Node
npx serve .
```

Open **http://localhost:8080** in a browser.

> Must be served over HTTP — opening `index.html` as a `file://` URL will fail to load `data.json`.

---

## Development

```bash
npm install       # install dev dependencies
npm run lint      # ESLint
npm test          # Jest (12 tests)
npm run ci        # lint + test together
```

---

## Project Structure

```
kindred-prototype/
├── index.html            App shell
├── styles.css            All application styles
├── data.json             Seed data
├── .gitlab-ci.yml        CI/CD — lint, test, security scanning, build, deploy
└── js/
    ├── app.js            Entry point — bootstrap, render loop, header, nav
    ├── config.js         Configuration — users, roles, feature switches
    ├── screens.js        Screen renderers — Discover, Pairs, Schedule, Confirmation
    ├── selectors.js      Pure derived-state helpers
    └── store.js          State container and reducer
```

---

## CI/CD Pipeline

| Stage | Job | Purpose |
|-------|-----|---------|
| `lint` | ESLint | Code quality |
| `test` | Jest | Unit tests (12 tests) |
| `security` | Semgrep SAST | Static analysis — XSS, injection, etc. |
| `security` | Secret Detection | Hardcoded credentials and tokens |
| `build` | Build check | Confirms all gates passed |
| `deploy` | Simulated deploy | Outputs a deploy confirmation (main only) |

Both security jobs use `allow_failure: false` — the pipeline **blocks** on any finding.
