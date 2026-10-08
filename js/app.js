// Kindred — app entry (vanilla ES module).
// Clean prototype: no LaunchDarkly, no feature flags, no conversion tracking.

import {
  ROLES,
  currentRole,
  setRole,
  DEMO_USERS,
  currentUserKey,
  setUser,
} from './config.js';
import { createInitialState, createStore } from './store.js';
import {
  renderDiscover,
  renderPairs,
  renderSchedule,
  renderConfirmation,
} from './screens.js';

// Store handle; assigned once the AJAX seed load resolves.
let store = null;

// Seed time slots, captured at bootstrap so the Schedule screen can render.
let timeSlots = [];

// ---------------------------------------------------------------------------
// DOM handles
// ---------------------------------------------------------------------------

const appEl = document.getElementById('app');
const headerEl = document.getElementById('app-header');
const loadingEl = document.getElementById('loading');
const screenEl = document.getElementById('screen');
const navEl = document.getElementById('bottom-nav');

// ---------------------------------------------------------------------------
// Screen renderers
// ---------------------------------------------------------------------------

const SCREEN_RENDERERS = {
  discover: (state) => renderDiscover(state, store.dispatch),
  pairs: (state) => renderPairs(state, store.dispatch),
  schedule: (state) => renderSchedule(state, store.dispatch, timeSlots),
  confirmation: (state) => renderConfirmation(state, store.dispatch),
};

// ---------------------------------------------------------------------------
// Bottom nav
// ---------------------------------------------------------------------------

const NAV_ENTRIES = [
  { screen: 'discover', label: 'Discover', icon: discoverIcon() },
  { screen: 'pairs', label: 'Pairs', icon: pairsIcon() },
  { screen: 'schedule', label: 'Schedule', icon: scheduleIcon() },
];

function renderBottomNav(state) {
  navEl.innerHTML = '';

  for (const { screen, label, icon } of NAV_ENTRIES) {
    const isActive = state.activeScreen === screen;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = ['kd-nav-entry', isActive ? 'kd-nav-entry--active' : '']
      .filter(Boolean)
      .join(' ');
    if (isActive) button.setAttribute('aria-current', 'page');
    button.dataset.testid = `bottom-nav-${screen}`;

    button.innerHTML = `
      <span class="kd-nav-icon" aria-hidden="true">${icon}</span>
      <span class="kd-nav-label">${label}</span>`;

    button.addEventListener('click', () => {
      store.dispatch({ type: 'NAVIGATE', screen });
    });

    navEl.appendChild(button);
  }
}

// --- Icons ---

function discoverIcon() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg>`;
}

function pairsIcon() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><circle cx="9" cy="8" r="3.2" /><circle cx="17" cy="9.5" r="2.6" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M15.5 19c0-1.9.9-3.6 2.3-4.4" /></svg>`;
}

function scheduleIcon() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><line x1="3.5" y1="9" x2="20.5" y2="9" /><line x1="8" y1="2.5" x2="8" y2="6" /><line x1="16" y1="2.5" x2="16" y2="6" /></svg>`;
}

// ---------------------------------------------------------------------------
// App header — user + role selectors
// ---------------------------------------------------------------------------

function handleRoleChange(nextRole) {
  if (nextRole === currentRole) return;
  setRole(nextRole);
  renderHeader();
  render();
}

function handleUserChange(nextUserKey) {
  if (nextUserKey === currentUserKey) return;
  setUser(nextUserKey);
  renderHeader();
  render();
}

function headerSelect({ id, testid, ariaLabel, items, selected, onChange }) {
  const select = document.createElement('select');
  select.id = id;
  select.className = 'kd-role-select';
  select.dataset.testid = testid;
  select.setAttribute('aria-label', ariaLabel);

  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    if (item.value === selected) option.selected = true;
    select.appendChild(option);
  }

  select.addEventListener('change', (event) => onChange(event.target.value));
  return select;
}

function renderHeader() {
  headerEl.innerHTML = '';

  headerEl.appendChild(
    headerSelect({
      id: 'user-select',
      testid: 'user-select',
      ariaLabel: 'Select demo user',
      items: DEMO_USERS.map((u) => ({ value: u.key, label: u.name })),
      selected: currentUserKey,
      onChange: handleUserChange,
    }),
  );

  headerEl.appendChild(
    headerSelect({
      id: 'role-select',
      testid: 'role-select',
      ariaLabel: 'Select user role',
      items: ROLES.map((r) => ({ value: r.id, label: r.label })),
      selected: currentRole,
      onChange: handleRoleChange,
    }),
  );
}

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

function render() {
  const state = store.getState();
  const renderScreen =
    SCREEN_RENDERERS[state.activeScreen] || SCREEN_RENDERERS.discover;

  renderHeader();
  screenEl.className = 'kd-content';
  screenEl.replaceChildren(renderScreen(state));
  renderBottomNav(state);
}

// ---------------------------------------------------------------------------
// Bootstrap — load seed data and start the app
// ---------------------------------------------------------------------------

function showError(message) {
  if (loadingEl) loadingEl.classList.add('kd-hidden');
  appEl.innerHTML = `<div class="kd-error"><p>${message}</p></div>`;
}

async function bootstrap() {
  try {
    const response = await fetch('./data.json');
    if (!response.ok) {
      throw new Error(`Failed to load seed data (HTTP ${response.status})`);
    }
    const seed = await response.json();

    const initialState = createInitialState(seed);
    timeSlots = seed.timeSlots || [];
    store = createStore(initialState, timeSlots);

    if (loadingEl) loadingEl.classList.add('kd-hidden');
    store.subscribe(render);
    render();
  } catch (error) {
    showError('Something went wrong loading Kindred. Please refresh to try again.');
    console.error('[Kindred] bootstrap failed:', error);
  }
}

bootstrap();
