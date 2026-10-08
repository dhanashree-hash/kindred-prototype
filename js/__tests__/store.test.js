import { reducer } from '../store.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const WORKSHOPS = [
  {
    id: 'ws-001',
    title: 'Wheel Throwing Basics',
    studio: 'Clay Space SF',
    location: 'Mission District',
    distance: '0.4 miles',
    price: '$65',
    sessionDate: '2026-11-15',
    sessionTime: '10:00 AM',
    spotsLeft: 3,
  },
];

const TIME_SLOTS = [
  { id: 'slot-1', label: 'Morning', time: '10:00 AM' },
  { id: 'slot-2', label: 'Afternoon', time: '2:00 PM' },
  { id: 'slot-3', label: 'Evening', time: '6:00 PM' },
];

/** Base state with an active scheduling session — nothing selected yet. */
const STATE_NOTHING_SELECTED = {
  currentUserId: 'user-1',
  users: { 'user-1': { name: 'Demo User 1', photo: null } },
  workshops: WORKSHOPS,
  neighbors: [],
  pairingRequests: [],
  interestedList: [],
  pairingWorkshopId: null,
  activeScreen: 'schedule',
  scheduling: {
    workshopId: 'ws-001',
    attendanceMode: 'solo',
    selectedDate: null,
    selectedSlot: null,
    validationMessage: null,
    confirmed: false,
  },
  workshopPass: null,
  searchTerm: '',
  activeMedium: 'All',
};

/** State with only a date selected — no slot. */
const STATE_DATE_ONLY = {
  ...STATE_NOTHING_SELECTED,
  scheduling: {
    ...STATE_NOTHING_SELECTED.scheduling,
    selectedDate: '2026-11-15',
    selectedSlot: null,
  },
};

/** State with both date and slot selected — ready to confirm. */
const STATE_FULLY_SELECTED = {
  ...STATE_NOTHING_SELECTED,
  scheduling: {
    ...STATE_NOTHING_SELECTED.scheduling,
    selectedDate: '2026-11-15',
    selectedSlot: 'slot-1',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM_SCHEDULE — validation tests
// These tests define the contract: a user MUST select both a date and a time
// slot before the app creates a workshop pass and navigates to confirmation.
// ─────────────────────────────────────────────────────────────────────────────

describe('CONFIRM_SCHEDULE — input validation', () => {
  const action = { type: 'CONFIRM_SCHEDULE' };

  test('stays on schedule screen when neither date nor slot is selected', () => {
    const next = reducer(STATE_NOTHING_SELECTED, action, TIME_SLOTS);

    expect(next.activeScreen).toBe('schedule');
  });

  test('does NOT create a workshop pass when neither date nor slot is selected', () => {
    const next = reducer(STATE_NOTHING_SELECTED, action, TIME_SLOTS);

    expect(next.workshopPass).toBeNull();
  });

  test('shows a validation message when neither date nor slot is selected', () => {
    const next = reducer(STATE_NOTHING_SELECTED, action, TIME_SLOTS);

    expect(next.scheduling.validationMessage).toBe(
      'Please choose a date and a time slot',
    );
  });

  test('stays on schedule screen when only a date is selected (no slot)', () => {
    const next = reducer(STATE_DATE_ONLY, action, TIME_SLOTS);

    expect(next.activeScreen).toBe('schedule');
  });

  test('does NOT create a workshop pass when only a date is selected', () => {
    const next = reducer(STATE_DATE_ONLY, action, TIME_SLOTS);

    expect(next.workshopPass).toBeNull();
  });

  test('shows a validation message when only a date is selected', () => {
    const next = reducer(STATE_DATE_ONLY, action, TIME_SLOTS);

    expect(next.scheduling.validationMessage).toBe(
      'Please choose a date and a time slot',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM_SCHEDULE — success path
// ─────────────────────────────────────────────────────────────────────────────

describe('CONFIRM_SCHEDULE — success path', () => {
  const action = { type: 'CONFIRM_SCHEDULE' };

  test('navigates to confirmation when both date and slot are selected', () => {
    const next = reducer(STATE_FULLY_SELECTED, action, TIME_SLOTS);

    expect(next.activeScreen).toBe('confirmation');
  });

  test('creates a workshop pass with correct date and time', () => {
    const next = reducer(STATE_FULLY_SELECTED, action, TIME_SLOTS);

    expect(next.workshopPass).not.toBeNull();
    expect(next.workshopPass.date).toBe('2026-11-15');
    expect(next.workshopPass.time).toBe('10:00 AM');
  });

  test('workshop pass contains correct workshop details', () => {
    const next = reducer(STATE_FULLY_SELECTED, action, TIME_SLOTS);

    expect(next.workshopPass.title).toBe('Wheel Throwing Basics');
    expect(next.workshopPass.studio).toBe('Clay Space SF');
    expect(next.workshopPass.location).toBe('Mission District');
    expect(next.workshopPass.attendanceMode).toBe('solo');
    expect(next.workshopPass.identityShared).toBe(false);
  });

  test('marks scheduling as confirmed', () => {
    const next = reducer(STATE_FULLY_SELECTED, action, TIME_SLOTS);

    expect(next.scheduling.confirmed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM_SCHEDULE — edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('CONFIRM_SCHEDULE — edge cases', () => {
  const action = { type: 'CONFIRM_SCHEDULE' };

  test('is a no-op when there is no active scheduling session', () => {
    const state = { ...STATE_NOTHING_SELECTED, scheduling: null };
    const next = reducer(state, action, TIME_SLOTS);

    expect(next).toBe(state); // same reference — no change
  });

  test('never mutates the original state object', () => {
    const frozen = Object.freeze({
      ...STATE_NOTHING_SELECTED,
      scheduling: Object.freeze({ ...STATE_NOTHING_SELECTED.scheduling }),
    });

    expect(() => reducer(frozen, action, TIME_SLOTS)).not.toThrow();
  });
});
