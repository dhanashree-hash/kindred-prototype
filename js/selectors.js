// Pure selectors for the Kindred Workshop Pairing app (vanilla ES module).
//
// This module is the single place where a neighbor's real identity can be
// revealed. The default is always HIDDEN: any unknown, missing, or not-yet-
// accepted relationship resolves to the anonymous placeholder, so a data gap
// can never leak a real identity.

/**
 * The anonymous placeholder returned whenever an identity is not revealed.
 * photo: null renders as a neutral placeholder avatar.
 */
export const ANONYMOUS = {
  displayName: 'Anonymous neighbor',
  photo: null,
  isRevealed: false,
};

/**
 * True when `request` connects users `a` and `b` in either direction
 * (from=a&to=b OR from=b&to=a).
 */
function involves(request, a, b) {
  return (
    (request.fromUserId === a && request.toUserId === b) ||
    (request.fromUserId === b && request.toUserId === a)
  );
}

/**
 * Resolve another user's display identity relative to the current user.
 *
 * Revealed only when a pairing request between currentUserId and otherUserId
 * (either direction) has status 'accepted'. Otherwise, or when the user is
 * unknown/missing or otherUserId is falsy, the anonymous placeholder is
 * returned. Defaults to hidden and never throws.
 */
export function resolveIdentity(state, otherUserId) {
  // Default to hidden for a falsy id (never leak).
  if (!otherUserId) return ANONYMOUS;

  const mutuallyAccepted = state.pairingRequests.some(
    (r) =>
      r.status === 'accepted' && involves(r, state.currentUserId, otherUserId),
  );
  if (!mutuallyAccepted) return ANONYMOUS;

  const user = state.users[otherUserId];
  // Default to hidden for an unknown/missing user (never leak).
  if (!user) return ANONYMOUS;

  return { displayName: user.name, photo: user.photo, isRevealed: true };
}

/**
 * Resolve an identity for display, respecting the identityReveal flag.
 *
 * - identityRevealEnabled true (default): delegate to resolveIdentity
 *   (anonymous until mutual accept).
 * - identityRevealEnabled false: bypass anonymity and reveal the real identity
 *   from state.users directly, or fall back to the anonymized result if the
 *   user is missing. Mirrors the React useResolvedIdentity hook.
 */
export function resolveIdentityForDisplay(state, otherUserId, identityRevealEnabled) {
  const resolved = resolveIdentity(state, otherUserId);
  if (identityRevealEnabled) return resolved;

  const user = state.users[otherUserId];
  if (!user) return resolved;

  return { displayName: user.name, photo: user.photo, isRevealed: true };
}

// ---------------------------------------------------------------------------
// Discover filtering & chip derivation
// ---------------------------------------------------------------------------

/**
 * True when `workshop` satisfies the free-text `searchTerm`.
 * Case-insensitive; a trimmed-empty term matches everything. Otherwise the
 * term must appear in the workshop's medium, location, title, or studio.
 */
function matchesSearchTerm(workshop, searchTerm) {
  const term = searchTerm.trim().toLowerCase();
  if (term === '') return true;

  const haystacks = [
    workshop.medium,
    workshop.location,
    workshop.title,
    workshop.studio,
  ];

  return haystacks.some((field) => field.toLowerCase().includes(term));
}

/**
 * True when `workshop` satisfies the active medium chip. 'All' matches every
 * workshop; any other value requires an exact medium match.
 */
function matchesMedium(workshop, activeMedium) {
  if (activeMedium === 'All') return true;
  return workshop.medium === activeMedium;
}

/**
 * Filter `workshops` by both `searchTerm` and `activeMedium` (conjunction).
 * When activeMedium === 'All' AND the trimmed search term is empty, the
 * original array is returned unchanged (identity).
 */
export function filterWorkshops(workshops, searchTerm, activeMedium) {
  if (activeMedium === 'All' && searchTerm.trim() === '') {
    return workshops;
  }

  return workshops.filter(
    (workshop) =>
      matchesSearchTerm(workshop, searchTerm) &&
      matchesMedium(workshop, activeMedium),
  );
}

/**
 * Derive filter chips: the 'All' chip first, then the distinct media present
 * in `workshops`, deduped and in first-appearance order.
 */
export function deriveFilterChips(workshops) {
  const media = [];
  for (const workshop of workshops) {
    if (!media.includes(workshop.medium)) {
      media.push(workshop.medium);
    }
  }
  return ['All', ...media];
}

/** The summary result count for a filtered list — its length. */
export function resultCount(filtered) {
  return filtered.length;
}
