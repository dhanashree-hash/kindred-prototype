// Tiny state container + reducer for the Kindred Workshop Pairing app
// (vanilla ES module), ported from the React reducer.
//
// The reducer is pure: it never mutates the input state, and every transition
// returns a NEW state object (spread/clone). Identity reveal is NEVER done
// here directly — ACCEPT_REVEAL only flips a request to 'accepted', and
// resolveIdentity (selectors) derives the reveal as a consequence.

/**
 * Build a fresh mutable state object from the AJAX-loaded seed. Arrays/objects
 * are deep-cloned via structuredClone so the seed is never mutated
 * (reload-resets-to-seed semantics).
 *
 * NOTE (design): In production, sensitive identity data should not be included
 * in the initial client-side seed. The server should return identity details
 * only after a mutual acceptance is confirmed server-side. This prototype loads
 * all data client-side for demonstration purposes only.
 */
export function createInitialState(seed) {
  const clone = (value) => structuredClone(value);

  return {
    currentUserId: seed.currentUserId,
    users: clone(seed.users),
    workshops: clone(seed.workshops),
    neighbors: clone(seed.neighbors),
    pairingRequests: clone(seed.pairingRequests),
    interestedList: [],

    pairingWorkshopId: null,

    activeScreen: 'discover',

    scheduling: null,
    workshopPass: null,

    searchTerm: '',
    activeMedium: 'All',
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Fix #3: Allowlist of valid screen names — NAVIGATE rejects anything outside
// this set so an arbitrary string can never be stored as activeScreen.
const VALID_SCREENS = new Set(['discover', 'pairs', 'schedule', 'confirmation']);

/**
 * Build a fresh scheduling session for `workshopId` in the given attendance
 * mode. Nothing selected yet, no validation message, not confirmed.
 */
function startScheduling(workshopId, attendanceMode) {
  return {
    workshopId,
    attendanceMode,
    selectedDate: null,
    selectedSlot: null,
    validationMessage: null,
    confirmed: false,
  };
}

/**
 * True when a pairing request for `workshopId` that involves the current user
 * (either direction) has reached mutual accept. Decides the attendance mode
 * when beginning scheduling.
 */
function hasAcceptedPairing(state, workshopId) {
  return state.pairingRequests.some(
    (r) =>
      r.status === 'accepted' &&
      r.workshopId === workshopId &&
      (r.fromUserId === state.currentUserId ||
        r.toUserId === state.currentUserId),
  );
}

/**
 * Generate a unique id for a new outgoing pairing request.
 * Fix #4: Uses crypto.randomUUID() when available — cryptographically random
 * and collision-resistant. Falls back for environments that lack it (e.g. older
 * Node in tests) rather than silently using the predictable Date.now approach.
 */
function generateRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Reducer
//
// `timeSlots` is threaded in (from the seed) so CONFIRM_SCHEDULE can look up
// the selected slot's display time without importing the seed module.
// ---------------------------------------------------------------------------

export function reducer(state, action, timeSlots = []) {
  switch (action.type) {

    // Fix #3: NAVIGATE validates against the VALID_SCREENS allowlist.
    // An unrecognised screen name is silently ignored.
    case 'NAVIGATE': {
      if (!VALID_SCREENS.has(action.screen)) return state;
      return { ...state, activeScreen: action.screen };
    }

    // Fix #3: SET_SEARCH validates that the term is a string so a non-string
    // payload can never be stored in searchTerm and reach the render layer.
    case 'SET_SEARCH':
      return { ...state, searchTerm: typeof action.term === 'string' ? action.term : '' };

    // Fix #3: SET_MEDIUM validates against the media actually present in the
    // loaded workshops plus the sentinel 'All'. Unknown values are ignored.
    case 'SET_MEDIUM': {
      const knownMedia = new Set(['All', ...state.workshops.map((w) => w.medium)]);
      if (!knownMedia.has(action.medium)) return state;
      return { ...state, activeMedium: action.medium };
    }

    // --- Interested list (idempotent) --------------------------------------

    case 'FIND_PAIR': {
      const interestedList = state.interestedList.includes(action.workshopId)
        ? state.interestedList
        : [...state.interestedList, action.workshopId];

      return {
        ...state,
        interestedList,
        pairingWorkshopId: action.workshopId,
        activeScreen: 'pairs',
      };
    }

    // --- Start scheduling --------------------------------------------------

    case 'ATTEND_SOLO':
      return {
        ...state,
        scheduling: startScheduling(action.workshopId, 'solo'),
        activeScreen: 'schedule',
      };

    case 'BEGIN_SCHEDULE': {
      const mode = hasAcceptedPairing(state, action.workshopId)
        ? 'paired'
        : 'solo';
      return {
        ...state,
        scheduling: startScheduling(action.workshopId, mode),
        activeScreen: 'schedule',
      };
    }

    // --- Pairing request transitions ---------------------------------------

    // Fix #1: ACCEPT_REVEAL now enforces two conditions before accepting:
    //   1. r.toUserId === state.currentUserId  — only the recipient can accept
    //   2. r.status === 'incoming'             — only incoming requests can flip
    // This prevents a sender accepting their own outgoing request and bypassing
    // the other person's consent, and prevents a dismissed request being re-opened.
    case 'ACCEPT_REVEAL':
      return {
        ...state,
        pairingRequests: state.pairingRequests.map((r) =>
          r.id === action.requestId &&
          r.toUserId === state.currentUserId &&
          r.status === 'incoming'
            ? { ...r, status: 'accepted' }
            : r,
        ),
      };

    // Fix #1: DISMISS_REQUEST applies the same recipient + status guard.
    case 'DISMISS_REQUEST':
      return {
        ...state,
        pairingRequests: state.pairingRequests.map((r) =>
          r.id === action.requestId &&
          r.toUserId === state.currentUserId &&
          r.status === 'incoming'
            ? { ...r, status: 'dismissed' }
            : r,
        ),
      };

    // Fix #5: SEND_REQUEST deduplicates — only one active (outgoing or accepted)
    // request is allowed per (sender, recipient, workshop) combination. Prevents
    // request spam from repeated dispatches.
    case 'SEND_REQUEST': {
      const neighbor = state.neighbors.find((n) => n.id === action.neighborId);
      if (!neighbor) return state;

      const workshopId = neighbor.sharedWorkshopIds[0] || '';

      const isDuplicate = state.pairingRequests.some(
        (r) =>
          r.fromUserId === state.currentUserId &&
          r.toUserId === neighbor.userId &&
          r.workshopId === workshopId &&
          (r.status === 'outgoing' || r.status === 'accepted'),
      );
      if (isDuplicate) return state;

      const newRequest = {
        id: generateRequestId(),
        workshopId,
        fromUserId: state.currentUserId,
        toUserId: neighbor.userId,
        message: '',
        status: 'outgoing',
      };

      return {
        ...state,
        pairingRequests: [...state.pairingRequests, newRequest],
      };
    }

    // --- Scheduling selections ---------------------------------------------

    case 'INVITE_PAIR': {
      if (!state.scheduling) return state;
      if (state.scheduling.attendanceMode === 'paired') return state;
      return {
        ...state,
        scheduling: { ...state.scheduling, attendanceMode: 'paired' },
      };
    }

    // Fix #3: SELECT_DATE validates the value is an ISO-8601 date string
    // (YYYY-MM-DD). Non-conforming values are ignored.
    case 'SELECT_DATE': {
      if (!state.scheduling) return state;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(action.date ?? ''))) return state;
      return {
        ...state,
        scheduling: {
          ...state.scheduling,
          selectedDate: action.date,
          validationMessage: null,
        },
      };
    }

    // Fix #3: SELECT_SLOT validates the slotId is a non-empty string.
    case 'SELECT_SLOT': {
      if (!state.scheduling) return state;
      if (typeof action.slotId !== 'string' || !action.slotId) return state;
      return {
        ...state,
        scheduling: {
          ...state.scheduling,
          selectedSlot: action.slotId,
          validationMessage: null,
        },
      };
    }

    // --- Confirm & build the pass ------------------------------------------

    case 'CONFIRM_SCHEDULE': {
      const scheduling = state.scheduling;
      if (!scheduling) return state;

      const { selectedDate, selectedSlot } = scheduling;

      const workshop = state.workshops.find(
        (w) => w.id === scheduling.workshopId,
      );
      if (!workshop) return state;

      const slot = timeSlots.find((s) => s.id === selectedSlot);
      const time = slot ? slot.time : '';

      const workshopPass = {
        workshopId: workshop.id,
        date: selectedDate,
        time,
        location: workshop.location,
        studio: workshop.studio,
        title: workshop.title,
        attendanceMode: scheduling.attendanceMode,
        identityShared: false,
      };

      return {
        ...state,
        scheduling: { ...scheduling, confirmed: true },
        workshopPass,
        activeScreen: 'confirmation',
      };
    }

    // --- Share the current user's identity on the pass ---------------------

    case 'SHARE_IDENTITY': {
      if (!state.workshopPass) return state;
      if (state.workshopPass.identityShared) return state;
      return {
        ...state,
        workshopPass: { ...state.workshopPass, identityShared: true },
      };
    }

    default:
      return state;
  }
}

/**
 * Create a store around an initial state.
 * Returns { getState, dispatch, subscribe }.
 */
export function createStore(initialState, timeSlots = []) {
  let state = initialState;
  const subscribers = new Set();

  function getState() {
    return state;
  }

  function dispatch(action) {
    state = reducer(state, action, timeSlots);
    subscribers.forEach((fn) => fn(state));
    return action;
  }

  function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  return { getState, dispatch, subscribe };
}
