# GitLab Issue — Copy-paste this into GitLab Issues → New Issue

---

**Title:**
```
bug: XSS vulnerability in search feedback component (CWE-79)
```

**Description (paste into the issue body):**

---

## Summary

A DOM-based Cross-Site Scripting (XSS) vulnerability has been identified in the
Discover screen's search feedback component. The active search term is injected
directly into the DOM via `innerHTML` without sanitisation, allowing an attacker
to execute arbitrary JavaScript in the context of any user's browser session.

**Severity:** 🔴 High  
**Type:** Security / Bug  
**Affected file:** `js/screens.js` — `renderDiscover()` function  
**Discovered by:** GitLab SAST (Semgrep) — automated security pipeline

---

## Steps to Reproduce

1. Open the Kindred app in a browser
2. Navigate to the Discover screen
3. In the search box, type: `<img src=x onerror=alert(document.cookie)>`
4. Observe: a JavaScript alert fires immediately, exposing session data

---

## Expected Behaviour

The search term is treated as plain text. Special characters like `<`, `>`, and `"` are
rendered literally — never interpreted as HTML or JavaScript.

## Actual Behaviour

The search term is injected into the DOM via `innerHTML` inside a template literal:

```js
feedback.innerHTML = `Showing results for: ${highlightMatch(searchTerm, searchTerm)}`;
```

`searchTerm` flows directly from `e.target.value` (the search `<input>`) through
`state.searchTerm` into `highlightMatch()`, whose return value is assigned to
`innerHTML` without any HTML escaping. This is a classic taint-source-to-sink path.

---

## Security Impact

| Vector | Detail |
|---|---|
| Attack type | DOM-based XSS (CWE-79) |
| User interaction | Required (victim must visit the page) |
| Privileges required | None |
| Impact | Session hijack, credential theft, UI redressing |
| CVSS estimate | 7.4 (High) |

---

## Root Cause

`highlightMatch()` builds an HTML string using `String.replace()` with a `<mark>` wrapper
and returns it as a raw string. That string is then set on `innerHTML`, making any
HTML characters in `searchTerm` executable.

The fix is to replace `innerHTML` assignment with safe DOM construction:
`document.createElement('mark')` + `textContent` + `DocumentFragment` — no HTML
parsing of user data at any point.

---

## Acceptance Criteria for the Fix

- [ ] `innerHTML` is no longer used with any value derived from `state.searchTerm`
- [ ] The `<mark>` highlight still appears visually (feature is preserved)
- [ ] GitLab SAST pipeline passes with zero high-severity findings
- [ ] Dependency Scanning and Secret Detection also report clean
- [ ] Entering `<img src=x onerror=alert(1)>` in the search box renders as plain text

---

**Labels:** `security`, `bug`, `priority::high`, `maintenance`  
**Assignee:** (assign to yourself for the demo)  
**Milestone:** v1.1 — Security Patch

---

> **Demo note:** Create this issue first in GitLab before starting the recording.
> Reference it in the MR with `Closes #<issue-number>` so the security fix
> is traceable from issue → MR → pipeline → deploy.
