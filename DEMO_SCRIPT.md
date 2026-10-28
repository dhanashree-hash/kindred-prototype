# GitLab Duo Demo Script — Kindred

**Theme:** Release → Maintenance → Security issue caught and fixed with AI assistance  
**Total time:** ~12–15 minutes  
**Audience:** Engineering or product stakeholders evaluating GitLab Duo + security tooling

---

## The Story

> "Kindred is a workshop pairing app that just shipped its first release.  
> The codebase is clean, security scanning is enforced, and the pipeline is green.  
> A few weeks later, during a maintenance cycle, a developer adds an analytics  
> integration — and accidentally introduces two security issues.  
> We'll use GitLab Duo and GitLab's built-in scanning to find and fix them,  
> without leaving the browser."

---

## Pre-Demo Checklist

- [ ] GitLab project created, **`main`** branch pushed (clean state)
- [ ] **`feature/analytics-integration`** branch pushed (has the security issues)
- [ ] Pipeline has run on `main` — all stages green ✅
- [ ] MR open from `feature/analytics-integration` → `main`
- [ ] Pipeline has run on the MR — security stage failed 🔴
- [ ] GitLab Duo Chat enabled (Ultimate tier)
- [ ] Web IDE open in the browser

---

## ── PHASE 1: Release ───────────────────────────────────────────────────────

### Step 1 — Ask Duo to Explain the Code (~2 min)

**Navigate to:** Web IDE → `main` branch → `js/screens.js`

**Scroll to `renderDiscover()`**, select the search feedback block, open Duo Chat:

```
Explain how the search feature works in renderDiscover().
Walk me through the highlightMatch() function — what does it do
and how does it safely handle user input?
```

**What Duo explains:**
- `highlightMatch()` takes the active search term and wraps matches in `<mark>` tags
- It builds a `DocumentFragment` using DOM APIs — `createElement`, `textContent`, `appendChild`
- User data is **never** passed to `innerHTML` — set via `textContent` only, preventing XSS
- The regex is built from an escaped version of the search term to prevent regex injection

**Say:**
> "The team built this safely from the start — Duo can confirm that right here.
> Let's see what the security reports show."

---

### Step 2 — Compliance & Security Report (Clean) (~1 min)

**Navigate to:** Security → Vulnerability Report

**Show:** Zero findings. All clear.

**Navigate to:** CI/CD → Pipelines → latest pipeline on `main`

**Show the stage breakdown:**
```
lint ✅  →  test ✅  →  security ✅  →  build ✅  →  deploy ✅
```

**Say:**
> "Security scanning is enforced — `allow_failure: false` means any vulnerability  
> would block the pipeline. Right now there's nothing to block. The app is clean,  
> the pipeline is green, and it's live on staging."

**This is the 'release' baseline. Everything is good. The app is shipped.**

---

## ── PHASE 2: Maintenance ───────────────────────────────────────────────────

### Step 3 — Run the Failing Pipeline (~1 min)

**Navigate to:** Merge Requests → `feature/analytics-integration` MR

**Show the MR description** (see `GITLAB_ISSUE.md` for the issue text).

**Point to the pipeline status on the MR:**
```
lint ✅  →  test ✅  →  security 🔴  →  build ░  →  deploy ░
```

**Say:**
> "A developer opened this MR during the maintenance cycle — it's meant to add an  
> analytics integration stub. The pipeline ran automatically when the branch was  
> pushed. Lint passes, tests pass, but it blocked at the security stage.  
> Let's find out why."

---

### Step 4 — Pipeline Failed: View the Security Report (~2 min)

**Navigate to:** MR → Security tab  
OR  
**Navigate to:** CI/CD → Pipelines → the failed MR pipeline → Security tab

**Show the two findings:**

| Severity | Type | File | Line |
|----------|------|------|------|
| 🔴 Critical | Hardcoded GitLab Personal Access Token | `js/config.js` | 86 |
| 🔴 High | DOM-based XSS — `innerHTML` with user input | `js/screens.js` | 492 |

**Say:**
> "Two issues caught before this ever touched main. A hardcoded API token — the developer  
> left their credentials in the source code. And a DOM-based XSS introduced when they  
> updated the search feature. The pipeline blocked both from shipping."

---

### Step 5 — Ask Duo to Fix It (~3 min)

#### Fix 1 — The XSS in `screens.js`

**Navigate to:** Web IDE → `feature/analytics-integration` → `js/screens.js`

**Select `highlightMatch()` and the feedback block, ask Duo:**

```
This code has a DOM-based XSS vulnerability. The highlightMatch()
function returns an HTML string that gets assigned to innerHTML,
with searchTerm coming directly from user input.

Fix it so the <mark> highlighting still works but user data never
touches innerHTML.
```

**Duo's fix — apply in the Web IDE:**

```js
function highlightMatch(text, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) return document.createTextNode(text);
  const term = searchTerm.trim();
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${safe})`, 'gi'));
  const fragment = document.createDocumentFragment();
  for (const part of parts) {
    if (part.toLowerCase() === term.toLowerCase()) {
      const mark = document.createElement('mark');
      mark.textContent = part;           // user data via textContent — never innerHTML
      fragment.appendChild(mark);
    } else {
      fragment.appendChild(document.createTextNode(part));
    }
  }
  return fragment;
}
```

**Also update the usage:**

```js
if (searchTerm.trim()) {
  const feedback = document.createElement('p');
  feedback.className = 'kd-search-feedback';
  feedback.appendChild(document.createTextNode('Showing results for: '));
  feedback.appendChild(highlightMatch(searchTerm, searchTerm));
  screen.appendChild(feedback);
}
```

#### Fix 2 — The hardcoded token in `config.js`

**Navigate to:** `js/config.js` → remove the hardcoded token:

```js
// Analytics integration (work in progress — not yet active)
// Token loaded from environment variable — never hardcode credentials.
const ANALYTICS_TOKEN = process.env.ANALYTICS_TOKEN || '';
export const analyticsEnabled = false;
```

**Commit with message:**
```
fix: replace innerHTML with safe DOM APIs, remove hardcoded token

- highlightMatch() now builds a DocumentFragment using textContent,
  eliminating the DOM-based XSS vector (CWE-79) caught by SAST.
- Replaced hardcoded ANALYTICS_TOKEN with environment variable reference.
  Credentials must never be stored in source code.
```

---

### Step 6 — Compliance & Security Report (Clean) (~1 min)

**After the fix pipeline completes:**

**Navigate to:** MR → Security tab  
**Show:** No new vulnerabilities introduced.

**Navigate to:** CI/CD → Pipelines → latest MR pipeline  
**Show:**
```
lint ✅  →  test ✅  →  security ✅  →  build ✅  →  deploy ✅
```

**Say:**
> "Same pipeline, same security gates — this time the code is clean.  
> The reports show no findings. We're back to the release baseline."

---

### Step 7 — Merge the MR (~30 sec)

**Navigate to:** Merge Requests → the open MR

**Show:**
- Pipeline passed ✅
- MR Security widget: no new vulnerabilities ✅
- MR is now mergeable

**Click Merge.**

**Say:**
> "That's the full loop. Release is clean, a maintenance update introduces real issues,  
> GitLab catches both, Duo fixes both, the security gate clears, and it merges safely.  
> The code that reaches main is always clean."

---

## Talking Points

**"Why did lint and tests pass but security fail?"**  
The test suite covers the store logic — pure reducer functions. DOM rendering in `screens.js` has no unit tests. And ESLint's `recommended` ruleset doesn't have XSS rules. SAST catches what tests and linting can't: how data flows at runtime.

**"How did the developer miss the XSS?"**  
The pattern `element.innerHTML = template_literal` looks completely normal. It's one of the most common mistakes in vanilla JavaScript. The developer was thinking about the feature, not the security model. That's exactly what automated scanning is for.

**"What about the token — shouldn't the developer have noticed?"**  
Secret detection scans the full diff, not just the files you're thinking about. A developer working on an analytics integration might commit config changes alongside UI changes. GitLab catches the token even if it's buried in an unrelated file.

**"Can the merge be blocked automatically?"**  
Yes — GitLab Ultimate security policies can require SAST to pass before any MR can be merged, enforced at the group level. No per-project CI config needed.

---

## Reference: XSS Taint Flow (Maintenance branch)

```
User types in <input id="discover-search">
  └─ onInput: dispatch({ type: 'SET_SEARCH', term: e.target.value })
       └─ reducer: state.searchTerm = action.term
            └─ renderDiscover() → const { searchTerm } = state
                 └─ highlightMatch(searchTerm, searchTerm)
                      └─ returns HTML string with raw searchTerm
                           └─ feedback.innerHTML = `...${result}`
                                                              ↑
                                                         XSS SINK (CWE-79)
```

## Before / After Summary

| | Release (`main`) | Maintenance MR (before fix) | Maintenance MR (after fix) |
|---|---|---|---|
| `highlightMatch` | Returns `DocumentFragment` | Returns HTML string | Returns `DocumentFragment` |
| User data | Via `textContent` only | Injected into `innerHTML` | Via `textContent` only |
| Credentials | No secrets in code | Hardcoded token | Environment variable |
| Security stage | ✅ Passes | 🔴 Blocks | ✅ Passes |
| Mergeable | ✅ | ✗ | ✅ |
