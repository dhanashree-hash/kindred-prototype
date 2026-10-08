// Kindred — app configuration (vanilla ES module).
// Clean prototype: no LaunchDarkly, no feature flags, no external SDK.

// ─────────────────────────────────────────────────────────────
// User roles
// ─────────────────────────────────────────────────────────────
export const ROLES = [
  { id: 'viewer', label: 'Viewer' },
  { id: 'regular', label: 'Regular user' },
];

export const DEFAULT_ROLE = 'regular';

// ─────────────────────────────────────────────────────────────
// Demo users
// ─────────────────────────────────────────────────────────────
const generateDemoUsers = () => {
  const users = [];
  for (let i = 1; i <= 306; i++) {
    users.push({ key: `demo-user-${i}`, name: `Demo User ${i}` });
  }
  return users;
};

export const DEMO_USERS = generateDemoUsers();
export const DEFAULT_USER_KEY = DEMO_USERS[0].key;

export let currentUserKey = DEFAULT_USER_KEY;
export let currentRole = DEFAULT_ROLE;

export function getUser(key = currentUserKey) {
  return DEMO_USERS.find((u) => u.key === key) || DEMO_USERS[0];
}

export function isValidUser(key) {
  return DEMO_USERS.some((u) => u.key === key);
}

export function setUser(key) {
  if (isValidUser(key)) currentUserKey = key;
  return currentUserKey;
}

export function isValidRole(id) {
  return ROLES.some((role) => role.id === id);
}

export function setRole(id) {
  if (isValidRole(id)) currentRole = id;
  return currentRole;
}

// ─────────────────────────────────────────────────────────────
// Features — all on by default, no flag gating
// ─────────────────────────────────────────────────────────────
export const features = {
  search: true,
  showFilters: true,
  matchPercentage: true,
  spotsLeft: true,
  findAPair: true,
  attendSolo: true,
  suggestedNeighbors: true,
  incomingRequests: true,
  sendPairingRequest: true,
  identityReveal: true,
  invitePair: true,
  timeSlots: true,
  shareIdentity: true,
  promotionalPricing: false,
};

/** Convenience predicate: is a named feature enabled? */
export function isEnabled(name) {
  return !!features[name];
}

// ─────────────────────────────────────────────────────────────
// Tier — hardcoded to 'paid' for prototype
// ─────────────────────────────────────────────────────────────
export const tier = 'paid';
