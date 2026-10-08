# Bug: Users can confirm a workshop schedule without selecting a date or time slot

## Summary

When a user taps the **Confirm** button on the Schedule screen without first
selecting a date and a time slot, the app silently creates a broken workshop
pass and navigates to the Confirmation screen. The pass shows a blank date and
an empty time, and the user has no way to know something went wrong.

## Steps to Reproduce

1. Open the Kindred app
2. Tap **"Find a pair"** or **"Attend solo"** on any workshop card
3. On the Schedule screen, do **not** select a date or time slot
4. Tap the **"Confirm"** button
5. Observe: the app navigates to the Confirmation screen and shows a workshop
   pass with a blank date and empty time

## Expected Behaviour

The app should **stay on the Schedule screen** and display a validation message:

> "Please choose a date and a time slot"

No workshop pass should be created until both a date and a time slot are
selected.

## Actual Behaviour

The app skips validation entirely and creates a workshop pass with:

```
date: null
time: ""
```

The user is taken to the Confirmation screen holding a broken, incomplete pass.

## Impact

- Users can end up with a workshop pass that shows no date or time
- The confirmation screen has no way to recover from this state
- Downstream: identity sharing and pairing confirmation happen against a pass
  that has no scheduled time

## Failing Tests

The following tests in `js/__tests__/store.test.js` are currently failing
because the validation gate is missing from the `CONFIRM_SCHEDULE` reducer:

```
CONFIRM_SCHEDULE — input validation
  ✕ stays on schedule screen when neither date nor slot is selected
  ✕ does NOT create a workshop pass when neither date nor slot is selected
  ✕ shows a validation message when neither date nor slot is selected
  ✕ stays on schedule screen when only a date is selected (no slot)
  ✕ does NOT create a workshop pass when only a date is selected
  ✕ shows a validation message when only a date is selected
```

## Root Cause (for investigation)

The `CONFIRM_SCHEDULE` case in `js/store.js` is missing its input validation
gate. The block below should be present before the workshop pass is created:

```js
if (!selectedDate || !selectedSlot) {
  return {
    ...state,
    scheduling: {
      ...scheduling,
      validationMessage: 'Please choose a date and a time slot',
    },
  };
}
```

## Acceptance Criteria

- [ ] Tapping Confirm with no date and no slot selected shows a validation
      message and does not navigate away
- [ ] Tapping Confirm with only a date selected shows a validation message
- [ ] Tapping Confirm with both a date and a slot creates a valid workshop pass
      and navigates to Confirmation
- [ ] All 6 failing tests pass
- [ ] CI pipeline (lint + test + build) is green

## Labels

`bug` `release-blocker` `store` `schedule`
