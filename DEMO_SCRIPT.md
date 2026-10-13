# GitLab Duo Demo Script — Kindred: Search Highlight Feature

**Theme:** AI-assisted development → code generation → code explanation → security scanning → fix  
**Total time:** ~15 minutes  
**Audience:** Engineering or product stakeholders evaluating GitLab Duo + security tooling

---

## Pre-Demo Checklist

Before you present, confirm these are ready:

- [ ] GitLab project open in browser: `Demo-group/kindred-prototype`
- [ ] GitLab issue #search-highlight created (use `GITLAB_ISSUE.md`)
- [ ] `main` branch has the SAST + deploy CI (commit `7f090c1`)
- [ ] `feature/search-highlight` pushed to GitLab and MR open (targeting `main`)
- [ ] MR pipeline has run and shows the SAST finding
- [ ] GitLab Duo Chat enabled on the project (Ultimate tier ✓)
- [ ] Kindred app open locally at `index.html` in a browser (to demo the exploit live)
- [ ] GitLab Web IDE open on `feature/search-highlight` → `js/screens.js`

---

## Act 1 — The Issue (2 min)

**What to show:** The GitLab issue.

**Navigate to:** Issues → the search-highlight issue you created.

**Say:**
> "We have a feature request from the product team. Users are searching for workshops  
> but there's no visual feedback showing what they searched for or where the match is.  
> The ask is simple: highlight the active search term above the results list."

**Point out:**
- The acceptance criteria (safe DOM rendering, no regressions)
- The linked file reference: `js/screens.js` → `renderDiscover()`

---

## Act 2 — GitLab Duo Generates the Code (3 min)

**What to show:** GitLab Duo Chat or Web IDE with Duo suggestions.

**Navigate to:** Web IDE → `js/screens.js` → scroll to `renderDiscover()`

**Option A — Duo Chat prompt (copy-paste this):**
```
I'm working on js/screens.js in the Kindred prototype.
In renderDiscover(), after the result count, I want to show a
feedback line like "Showing results for: [term]" with the search
term visually highlighted using a <mark> wrapper.

The active search term is in `searchTerm` (destructured from state).
Write a highlightMatch() helper and the feedback element for me.
```

**What Duo generates (or show the pre-written code in screens.js):**

```js
function highlightMatch(text, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) return text;
  const regex = new RegExp(searchTerm, 'gi');
  return text.replace(regex, '<mark>$&</mark>');
}
```

```js
if (searchTerm.trim()) {
  const feedback = document.createElement('p');
  feedback.className = 'kd-search-feedback';
  feedback.innerHTML = `Showing results for: ${highlightMatch(searchTerm, searchTerm)}`;
  screen.appendChild(feedback);
}
```

**Say:**
> "Duo writes the feature in seconds. It produces a `highlightMatch` helper that builds  
> the highlighted HTML string, and wires it into the Discover screen. The code looks  
> reasonable at a glance — it's using a regex, the helper has a guard clause, it's clean."

---

## Act 3 — Duo Explains the Code (2 min)

**What to show:** Duo Chat explaining what was just generated.

**This is the 'should have caught it earlier' moment in the narrative.**

**Select** the `highlightMatch` function and the feedback block in the Web IDE.  
**Open Duo Chat and ask:**
```
Explain what this code does, step by step. Are there any security
concerns I should be aware of before committing it?
```

**What Duo should explain:**
- `highlightMatch` builds an HTML string by replacing matches with `<mark>$&</mark>` using `RegExp`
- The result is assigned to `feedback.innerHTML`
- `searchTerm` originates from the search `<input>` — it is **raw user input**
- Assigning user-controlled input to `innerHTML` is a classic **DOM-based XSS** vector
- A payload like `<img src=x onerror=alert(document.cookie)>` would execute in the browser

**Say:**
> "This is a huge part of what Duo brings to the workflow. We can ask it to explain  
> the code *before* we commit. And it catches the problem right here — it flags  
> the innerHTML assignment and traces it back to the raw search input.  
> But let's say the developer skipped this step and pushed anyway. What happens next?"

**Live demo (optional — impressive if you have time):**
1. Open `index.html` in a browser
2. Type `<img src=x onerror=alert(1)>` into the search box
3. The alert fires immediately — zero special setup needed
4. Wipe the input, close the alert

---

## Act 4 — Push to GitLab → Pipeline Runs (2 min)

**What to show:** The MR and the running pipeline.

**Navigate to:** Merge Requests → the `feature/search-highlight` MR.

**Say:**
> "The developer pushes the branch and opens an MR. The pipeline kicks off automatically.  
> Watch the stages: Lint passes. Tests pass — Jest tests cover the store, not the  
> DOM renderer, so they don't catch this. Then SAST runs."

**Point to the pipeline stages:** `lint ✅ → test ✅ → sast 🔴 → build (blocked)`

**Say:**
> "SAST blocks the pipeline. The build stage never runs. The code cannot be merged  
> in this state. Let's look at what it found."

---

## Act 5 — Duo Explains the SAST Finding (3 min)

**What to show:** The Security tab in the MR.

**Navigate to:** MR → Security tab (or scroll to the security widget in the MR overview).

**Point out the finding:**
```
DOM-based XSS
File: js/screens.js
Rule: javascript.browser.security.dom-based-xss
Severity: High
```

**Click "Explain this vulnerability" (GitLab Duo button next to the finding).**

**What Duo explains:**
- The `innerHTML` sink on line ~500 of `screens.js`  
- The taint source: `searchTerm` comes from `e.target.value` in the search input
- The taint path: `e.target.value` → `dispatch(SET_SEARCH)` → `state.searchTerm` → `highlightMatch()` → `innerHTML`
- Why `highlightMatch` does not sanitize: it escapes regex characters but not HTML characters
- The impact: any user can inject arbitrary HTML and JavaScript into the page
- The CWE reference: CWE-79 (Improper Neutralization of Input During Web Page Generation)

**Ask Duo Chat:**
```
How do I fix this? Show me the safe version that keeps the
<mark> highlighting but removes the XSS risk.
```

**Say:**
> "Duo doesn't just flag the problem — it explains the exact taint path from the  
> user's keyboard to the vulnerable sink, and tells us how to fix it.  
> This is the difference between a SAST alert that developers ignore  
> and one that actually gets resolved."

---

## Act 6 — Apply the Fix (2 min)

**What to show:** The corrected code.

**Replace the vulnerable code with the safe version** (apply in Web IDE or locally):

```js
// SAFE: build the highlight using DOM APIs — no innerHTML on user data
function highlightMatch(text, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) return text;

  const term = searchTerm.trim();
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  const fragment = document.createDocumentFragment();

  for (const part of parts) {
    if (part.toLowerCase() === term.toLowerCase()) {
      const mark = document.createElement('mark');
      mark.textContent = part;     // textContent — never innerHTML
      fragment.appendChild(mark);
    } else {
      fragment.appendChild(document.createTextNode(part));
    }
  }

  return fragment;
}
```

```js
// SAFE: append the DocumentFragment instead of assigning innerHTML
if (searchTerm.trim()) {
  const feedback = document.createElement('p');
  feedback.className = 'kd-search-feedback';
  feedback.appendChild(document.createTextNode('Showing results for: '));
  feedback.appendChild(highlightMatch(searchTerm, searchTerm));
  screen.appendChild(feedback);
}
```

**Key change to point out:**
- `innerHTML = string` → gone
- `mark.textContent = part` — user data goes through `textContent`, never parsed as HTML
- `feedback.appendChild(fragment)` — DOM nodes, not HTML strings

**Commit message to use:**
```
fix: replace innerHTML with safe DOM construction in search feedback

highlightMatch() now returns a DocumentFragment built with
createElement + textContent instead of an HTML string. This
eliminates the DOM-based XSS vector identified by SAST (CWE-79).

No behaviour change for the user — <mark> highlighting still works.
```

---

## Act 7 — Clean Pipeline → Deploy (1 min)

**What to show:** The green pipeline after the fix.

**Navigate to:** Pipelines → the new pipeline triggered by the fix commit.

**Say:**
> "We push the fix. The pipeline runs again. This time SAST passes.  
> All four gates are green. And now the final stage runs — deploy."

**Point to:** `lint ✅ → test ✅ → sast ✅ → build ✅ → deploy ✅`

**Show the deploy log:**
```
🚀 Deploying Kindred to staging environment...
✅ Deployment complete — app is live at staging.kindred.app
```

**Say:**
> "The feature ships — with the vulnerability removed before it ever reached production.  
> That's the full loop: Duo helped write the code, Duo explained the risk,  
> SAST enforced the gate, and Duo guided the fix."

---

## Talking Points (If Questions Come Up)

**"Why didn't the Jest tests catch this?"**  
The test suite covers the Redux-style store (`store.test.js`). DOM rendering in `screens.js` has no tests — a common gap in vanilla JS prototypes. SAST catches what tests can't.

**"Would this work on a React or Vue project?"**  
Yes. GitLab SAST uses Semgrep which has rules for `dangerouslySetInnerHTML` in React, `v-html` in Vue, and raw DOM manipulation in plain JS. Same pipeline, same findings.

**"What if Duo's generated code is always safe?"**  
AI-generated code reflects patterns in its training data, which includes both safe and unsafe patterns. The search-highlight pattern (innerHTML + user input) is one of the most common XSS mistakes in the wild — it appears naturally in Duo's suggestions. SAST is the safety net regardless of source.

**"Does SAST block the merge?"**  
With GitLab Ultimate you can configure security policies to require SAST to pass before merging. In this demo the pipeline blocking is the gate — MR cannot be merged while the pipeline is red.

---

## Reference: The Taint Flow

```
User types in <input id="discover-search">
  └─ onInput fires: dispatch({ type: 'SET_SEARCH', term: e.target.value })
       └─ reducer: SET_SEARCH → state.searchTerm = action.term
            └─ renderDiscover() destructures: const { searchTerm } = state
                 └─ highlightMatch(searchTerm, searchTerm)
                      └─ returns HTML string containing searchTerm
                           └─ feedback.innerHTML = `...${result}`
                                                              ↑
                                                           XSS SINK
```

---

## Reference: Safe Fix Summary

| Before (vulnerable) | After (safe) |
|---|---|
| `highlightMatch` returns an HTML string | Returns a `DocumentFragment` |
| `feedback.innerHTML = string` | `feedback.appendChild(fragment)` |
| User data in HTML context | User data via `textContent` only |
| CWE-79 XSS | No XSS vector |
