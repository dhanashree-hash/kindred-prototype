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

/** Generate a unique-enough id for a new outgoing pairing request. */
function generateRequestId() {
  return `pr_out_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Reducer
//
// `timeSlots` is threaded in (from the seed) so CONFIRM_SCHEDULE can look up
// the selected slot's display time without importing the seed module.
// ---------------------------------------------------------------------------

export function reducer(state, action, timeSlots = []) {
  switch (action.type) {
    // --- Navigation & Discover controls ------------------------------------

    case 'NAVIGATE':
      return { ...state, activeScreen: action.screen };

    case 'SET_SEARCH':
      return { ...state, searchTerm: action.term };

    case 'SET_MEDIUM':
      return { ...state, activeMedium: action.medium };

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

    case 'ACCEPT_REVEAL':
      return {
        ...state,
        pairingRequests: state.pairingRequests.map((r) =>
          r.id === action.requestId ? { ...r, status: 'accepted' } : r,
        ),
      };

    case 'DISMISS_REQUEST':
      return {
        ...state,
        pairingRequests: state.pairingRequests.map((r) =>
          r.id === action.requestId ? { ...r, status: 'dismissed' } : r,
        ),
      };

    case 'SEND_REQUEST': {
      const neighbor = state.neighbors.find((n) => n.id === action.neighborId);
      if (!neighbor) return state; // unknown neighbor: no-op

      const newRequest = {
        id: generateRequestId(),
        workshopId: neighbor.sharedWorkshopIds[0] || '',
        fromUserId: state.currentUserId,
        toUserId: neighbor.userId,
        message: '',
        status: 'outgoing', // identity stays hidden
      };

      return {
        ...state,
        pairingRequests: [...state.pairingRequests, newRequest],
      };
    }

    // --- Scheduling selections ---------------------------------------------

    case 'INVITE_PAIR': {
      if (!state.scheduling) return state; // no active scheduling: no-op
      if (state.scheduling.attendanceMode === 'paired') return state; // idempotent
      return {
        ...state,
        scheduling: { ...state.scheduling, attendanceMode: 'paired' },
      };
    }

    case 'SELECT_DATE': {
      if (!state.scheduling) return state;
      return {
        ...state,
        scheduling: {
          ...state.scheduling,
          selectedDate: action.date,
          validationMessage: null,
        },
      };
    }

    case 'SELECT_SLOT': {
      if (!state.scheduling) return state;
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
      if (!scheduling) return state; // no active scheduling: no-op

      const { selectedDate, selectedSlot } = scheduling;

      const workshop = state.workshops.find(
        (w) => w.id === scheduling.workshopId,
      );
      if (!workshop) return state; // defensive: unknown workshop

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
      if (!state.workshopPass) return state; // no pass: no-op
      if (state.workshopPass.identityShared) return state; // idempotent
      return {
        ...state,
        workshopPass: { ...state.workshopPass, identityShared: true },
      };
    }

    // --- Unknown action: return state unchanged ----------------------------

    default:
      return state;
  }
}

/**
 * Create a store around an initial state.
 *
 * Returns { getState, dispatch, subscribe }. dispatch runs the reducer (with
 * the store's timeSlots) to compute the next state, then notifies subscribers.
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
