# GitLab Duo Demo Script — Kindred

**Theme:** Release with clean security posture → maintenance regression caught by tests → AI-guided fix → clean merge  
**Total time:** ~12 minutes  
**Audience:** Engineering or product stakeholders evaluating GitLab Duo + security tooling

---

## The Story

> "Kindred just shipped. The pipeline is green, the security report is clean.
> A few weeks into maintenance, a developer refactors the scheduling confirmation
> handler — and accidentally removes the date/time validation gate.
> The pipeline catches it. We use GitLab Duo to understand and fix the issue,
> then merge safely."

---

## Pre-Demo Checklist

- [ ] GitLab project created with **two branches pushed**: `main` and `feature/analytics-integration`
- [ ] Pipeline has run on `main` — all stages green ✅
- [ ] MR open from `feature/analytics-integration` → `main`
- [ ] Pipeline has run on the MR — test stage failed 🔴
- [ ] GitLab Duo Chat enabled
- [ ] Web IDE open in the browser

---

## ── PHASE 1: Release ─────────────────────────────────────────────────────

### Step 1 — Ask Duo to Explain the Code (~2 min)

**Navigate to:** Web IDE → `main` branch → `js/store.js`

**Scroll to the `CONFIRM_SCHEDULE` case (~line 268), select it, open Duo Chat:**

```
Explain what CONFIRM_SCHEDULE does in this reducer.
Walk me through the validation logic — what happens when a user
taps Confirm without picking a date or time slot?
```

**What Duo explains:**
- `CONFIRM_SCHEDULE` validates that both `selectedDate` and `selectedSlot` are set
- If either is missing, it returns a `validationMessage` and keeps the user on the schedule screen
- Only when both are selected does it build the `workshopPass` and navigate to confirmation
- This prevents the app from creating a booking with null date/time fields

**Say:**
> "The validation gate is the key safety check here. Let's confirm the pipeline
> and security reports reflect this clean state."

---

### Step 2 — Compliance & Security Report: Clean (~1 min)

**Navigate to:** Security → Vulnerability Report

**Show:** Zero findings. No vulnerabilities in the codebase.

**Navigate to:** CI/CD → Pipelines → latest pipeline on `main`

**Show all five stages green:**
```
lint ✅  →  test ✅  →  security ✅  →  build ✅  →  deploy ✅
```

**Say:**
> "Security scanning is enforced — any finding would block this pipeline.
> There's nothing to block. Tests pass, security is clean, the app is live."

---

## ── PHASE 2: Maintenance ─────────────────────────────────────────────────

### Step 3 — The Failing Pipeline (~1 min)

**Navigate to:** Merge Requests → `feature/analytics-integration`

**Show the MR:** A developer refactored the `CONFIRM_SCHEDULE` handler to "simplify" it.
The commit message reads:
> *"refactor: simplify CONFIRM_SCHEDULE handler — removed intermediate validation block  
> to streamline the confirm flow. The UI already prevents confirming without selections."*

**Point to the pipeline badge on the MR:**
```
lint ✅  →  test 🔴  →  security ✅  →  build ░  →  deploy ░
```

**Say:**
> "Lint passes — this isn't a syntax error. Security passes — there's no vulnerability.
> But the test stage blocked the pipeline. Let's see why."

---

### Step 4 — View the Test Failures (~2 min)

**Navigate to:** MR → CI/CD → the failed `test` job → job log

**Show the failing test output:**

```
FAIL js/__tests__/store.test.js

  CONFIRM_SCHEDULE — input validation
    ✗ stays on schedule screen when neither date nor slot is selected
    ✗ does NOT create a workshop pass when neither date nor slot is selected
    ✗ shows a validation message when neither date nor slot is selected
    ✗ stays on schedule screen when only a date is selected (no slot)
    ✗ does NOT create a workshop pass when only a date is selected
    ✗ shows a validation message when only a date is selected

  CONFIRM_SCHEDULE — success path
    ✓ navigates to confirmation when both date and slot are selected
    ✓ creates a workshop pass with correct date and time
    ...

Tests: 6 failed, 6 passed, 12 total
```

**Say:**
> "Six tests fail — all in the input validation group. The success path still works,
> which confirms the refactor didn't break the happy path. But the guard that prevents
> a booking without a date or time is gone. A user could now confirm a session
> and get a pass with null date and time."

**Navigate to:** Security → Vulnerability Report (or MR → Security tab)

**Show:** Still zero findings. The security report is clean.

**Say:**
> "This isn't a security vulnerability — it's a functional regression.
> The security report is still clean. The tests are the gate that caught this."

---

### Step 5 — Ask Duo to Fix It (~2 min)

**Navigate to:** Web IDE → `feature/analytics-integration` → `js/store.js`

**Select the `CONFIRM_SCHEDULE` case, open Duo Chat:**

```
The tests are failing because the validation gate is missing from
CONFIRM_SCHEDULE. The reducer should block confirmation when
selectedDate or selectedSlot is null, and return a validationMessage.

Show me the fix.
```

**Duo's fix — apply in the Web IDE:**

```js
case 'CONFIRM_SCHEDULE': {
  const scheduling = state.scheduling;
  if (!scheduling) return state;

  const { selectedDate, selectedSlot } = scheduling;

  // Both a date and a time slot are required before creating a pass.
  if (!selectedDate || !selectedSlot) {
    return {
      ...state,
      scheduling: {
        ...scheduling,
        validationMessage: 'Please choose a date and a time slot',
      },
    };
  }

  // ... rest of the handler unchanged
```

**Commit message:**
```
fix: restore date and time slot validation in CONFIRM_SCHEDULE

The validation gate was accidentally removed in the previous refactor.
Without it, a workshop pass can be created with null date and time fields.

Restores the guard that returns a validationMessage when either
selectedDate or selectedSlot is not set.
```

---

### Step 6 — Compliance & Security Report: Clean (~30 sec)

**After the fix pipeline completes:**

**Navigate to:** CI/CD → Pipelines → latest MR pipeline

**Show all stages green:**
```
lint ✅  →  test ✅  →  security ✅  →  build ✅  →  deploy ✅
```

**Navigate to:** Security → Vulnerability Report

**Show:** Zero findings. Same clean state as the release baseline.

**Say:**
> "All 12 tests pass. Security is still clean. We're back to the same state
> as the release — the regression is fixed and nothing new was introduced."

---

### Step 7 — Merge (~30 sec)

**Navigate to:** Merge Requests → the open MR

**Show:**
- Pipeline passed ✅
- No new security vulnerabilities ✅
- MR is mergeable

**Click Merge.**

**Say:**
> "From clean release, through a realistic maintenance regression, to a fix —
> without leaving the browser. The tests caught what lint and security couldn't.
> Duo explained it, fixed it, and the pipeline confirmed it."

---

## Talking Points

**"Why didn't lint catch this?"**  
ESLint checks for syntax and style. Removing a validation block is perfectly valid JavaScript — there's no rule that says 'you must validate before building an object.' Tests catch semantic regressions, not just syntax issues.

**"Why didn't the security scan catch this?"**  
The security scanner looks for vulnerabilities — XSS, injection, hardcoded secrets. A missing business logic validation isn't a security vulnerability in the traditional sense. It's a functional bug, and that's exactly what unit tests are for.

**"The developer's commit message says 'the UI already prevents it' — is that right?"**  
Partially. The UI disables the Confirm button until both are selected. But the reducer is the source of truth — the store should never depend on the UI to enforce invariants. A UI can be bypassed; a reducer guard cannot.

**"How does this scale to bigger projects?"**  
The pattern is the same: reducers enforce invariants, tests document those invariants, and the pipeline enforces the tests. Duo helps developers understand and restore invariants they didn't write themselves.
