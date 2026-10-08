// Kindred — screen + shared-component renderers (vanilla ES module).
// Clean prototype: no feature flag gating, no tier checks, all features always on.

import { resolveIdentityForDisplay, filterWorkshops, deriveFilterChips, resultCount } from './selectors.js';

const LOCATION_CONTEXT = 'Mission District, SF';

// ---------------------------------------------------------------------------
// Tiny DOM helpers
// ---------------------------------------------------------------------------

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'className') {
      node.className = value;
    } else if (key === 'textContent') {
      node.textContent = value;
    } else if (key === 'onClick') {
      node.addEventListener('click', value);
    } else if (key === 'onInput') {
      node.addEventListener('input', value);
    } else if (key === 'dataset') {
      for (const [dk, dv] of Object.entries(value)) node.dataset[dk] = dv;
    } else {
      node.setAttribute(key, value);
    }
  }

  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === undefined || child === null || child === false) continue;
    node.appendChild(
      typeof child === 'string' ? document.createTextNode(child) : child,
    );
  }

  return node;
}

function svg(markup) {
  const wrapper = document.createElement('span');
  wrapper.innerHTML = markup;
  return wrapper.firstElementChild;
}

// ---------------------------------------------------------------------------
// Date / number formatting helpers
// ---------------------------------------------------------------------------

function parseIsoDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatSessionDate(sessionDate) {
  const date = parseIsoDate(sessionDate);
  if (!date) return sessionDate;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateLabel(iso) {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDayLabel(iso) {
  const date = parseIsoDate(iso);
  if (!date) return { weekday: '', day: iso };
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(date.getDate()),
  };
}

// ---------------------------------------------------------------------------
// Pricing display — always shows regular price (no promotional pricing)
// ---------------------------------------------------------------------------

function priceDisplay(price) {
  return el('span', {
    className: 'kd-price',
    textContent: price,
    dataset: { testid: 'workshop-price' },
  });
}

// ---------------------------------------------------------------------------
// Shared component renderers
// ---------------------------------------------------------------------------

function personGlyph() {
  return svg(
    `<svg class="kd-glyph" viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.69-8 6v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-3.31-3.58-6-8-6Z" /></svg>`,
  );
}

export function renderIdentity(identity, size = 'md') {
  const { displayName, photo, isRevealed } = identity;
  const showPhoto = isRevealed && photo !== null && photo !== undefined;

  const root = el('div', {
    className: `kd-identity kd-identity--${size === 'sm' ? 'sm' : 'md'}`,
  });

  if (showPhoto) {
    root.appendChild(
      el('img', { className: 'kd-avatar', src: photo, alt: displayName }),
    );
  } else {
    const placeholder = el('div', {
      className: 'kd-placeholder',
      role: 'img',
      'aria-label': 'Hidden identity',
    });
    placeholder.appendChild(personGlyph());
    root.appendChild(placeholder);
  }

  root.appendChild(
    el('span', { className: 'kd-identity-name', textContent: displayName }),
  );

  return root;
}

export function workshopCard(state, workshop, dispatch) {
  const { id, medium, price, title, studio, location, distance, sessionDate, sessionTime, spotsLeft } = workshop;

  const card = el('article', {
    className: 'kd-card',
    dataset: { testid: 'workshop-card' },
  });

  const header = el('div', { className: 'kd-card-header' }, [
    el('span', { className: 'kd-medium-tag', textContent: medium, dataset: { testid: 'workshop-medium' } }),
    priceDisplay(price),
  ]);
  card.appendChild(header);

  card.appendChild(el('h3', { className: 'kd-card-title', textContent: title, dataset: { testid: 'workshop-title' } }));
  card.appendChild(el('p', { className: 'kd-card-studio', textContent: studio, dataset: { testid: 'workshop-studio' } }));
  card.appendChild(el('p', { className: 'kd-card-location', textContent: `${location} · ${distance}`, dataset: { testid: 'workshop-location' } }));
  card.appendChild(el('p', { className: 'kd-card-datetime', textContent: `${formatSessionDate(sessionDate)} · ${sessionTime}`, dataset: { testid: 'workshop-datetime' } }));

  // Spots left — always shown when available
  const hasSpotsLeft = spotsLeft !== undefined && spotsLeft !== null;
  if (hasSpotsLeft) {
    card.appendChild(
      el('p', { className: 'kd-spots-left', textContent: `${spotsLeft} spots left`, dataset: { testid: 'workshop-spots-left' } }),
    );
  }

  // Actions — always show both buttons
  const actions = el('div', { className: 'kd-card-actions' });
  actions.appendChild(
    el('button', {
      type: 'button',
      className: 'kd-btn-primary',
      textContent: 'Find a pair',
      onClick: () => dispatch({ type: 'FIND_PAIR', workshopId: id }),
    }),
  );
  actions.appendChild(
    el('button', {
      type: 'button',
      className: 'kd-btn-secondary',
      textContent: 'Attend solo',
      onClick: () => dispatch({ type: 'ATTEND_SOLO', workshopId: id }),
    }),
  );
  card.appendChild(actions);

  return card;
}

export function neighborCard(state, neighbor, dispatch) {
  // Identity always revealed in prototype
  const identity = resolveIdentityForDisplay(state, neighbor.userId, false);

  const card = el('article', {
    className: 'kd-neighbor-card',
    dataset: { testid: 'neighbor-card' },
  });

  const header = el('div', { className: 'kd-neighbor-header' });
  header.appendChild(renderIdentity(identity, 'sm'));
  // Match percentage always shown
  header.appendChild(
    el('span', {
      className: 'kd-match',
      textContent: `${neighbor.matchPercentage}% match`,
      dataset: { testid: 'neighbor-match' },
    }),
  );
  card.appendChild(header);

  card.appendChild(el('p', { className: 'kd-distance', textContent: neighbor.distance, dataset: { testid: 'neighbor-distance' } }));
  card.appendChild(el('p', { className: 'kd-bio', textContent: neighbor.bio, dataset: { testid: 'neighbor-bio' } }));

  if (neighbor.interestTags.length > 0) {
    const tags = el('ul', { className: 'kd-tags', dataset: { testid: 'neighbor-tags' } });
    for (const tag of neighbor.interestTags) {
      tags.appendChild(el('li', { className: 'kd-tag', textContent: tag }));
    }
    card.appendChild(tags);
  }

  // Send pairing request — always shown
  const requestSent = state.pairingRequests.some(
    (r) =>
      r.fromUserId === state.currentUserId &&
      r.toUserId === neighbor.userId &&
      (r.status === 'outgoing' || r.status === 'accepted'),
  );

  const actions = el('div', { className: 'kd-neighbor-actions' });
  if (requestSent) {
    actions.appendChild(
      el('button', {
        type: 'button',
        className: 'kd-neighbor-action--sent',
        textContent: 'Request sent',
        disabled: 'true',
        'aria-disabled': 'true',
        dataset: { testid: 'neighbor-request-sent' },
      }),
    );
  } else {
    actions.appendChild(
      el('button', {
        type: 'button',
        className: 'kd-neighbor-action',
        textContent: 'Send pairing request',
        dataset: { testid: 'neighbor-send-request' },
        onClick: () => dispatch({ type: 'SEND_REQUEST', neighborId: neighbor.id }),
      }),
    );
  }
  card.appendChild(actions);

  return card;
}

export function pairingRequestCard(state, request, dispatch) {
  const identity = resolveIdentityForDisplay(state, request.fromUserId, false);
  const workshop = state.workshops.find((w) => w.id === request.workshopId);

  const card = el('article', { className: 'kd-request-card', dataset: { testid: 'pairing-request-card' } });

  const requester = el('div', { className: 'kd-request-requester' });
  requester.appendChild(renderIdentity(identity, 'sm'));
  card.appendChild(requester);

  if (workshop) {
    card.appendChild(el('p', { className: 'kd-request-workshop', textContent: `for ${workshop.title}`, dataset: { testid: 'pairing-request-workshop' } }));
  }

  card.appendChild(el('p', { className: 'kd-request-message', textContent: request.message, dataset: { testid: 'pairing-request-message' } }));

  const actions = el('div', { className: 'kd-request-actions' }, [
    el('button', {
      type: 'button',
      className: 'kd-request-primary',
      textContent: 'Accept & reveal',
      onClick: () => dispatch({ type: 'ACCEPT_REVEAL', requestId: request.id }),
    }),
    el('button', {
      type: 'button',
      className: 'kd-request-secondary',
      textContent: 'Not now',
      onClick: () => dispatch({ type: 'DISMISS_REQUEST', requestId: request.id }),
    }),
  ]);
  card.appendChild(actions);

  return card;
}

export function timeSlotPicker(state, timeSlots, dispatch) {
  const selectedSlot = state.scheduling ? state.scheduling.selectedSlot : null;

  const picker = el('div', { className: 'kd-slot-picker', role: 'radiogroup', 'aria-label': 'Choose a time slot' });

  for (const slot of timeSlots) {
    const isSelected = selectedSlot === slot.id;
    picker.appendChild(
      el('button', {
        type: 'button',
        role: 'radio',
        'aria-checked': String(isSelected),
        className: `kd-slot${isSelected ? ' kd-slot--selected' : ''}`,
        dataset: { testid: 'time-slot', slotId: slot.id },
        onClick: () => dispatch({ type: 'SELECT_SLOT', slotId: slot.id }),
      }, [
        el('span', { className: 'kd-slot-label', textContent: slot.label }),
        el('span', { className: 'kd-slot-time', textContent: slot.time }),
      ]),
    );
  }

  return picker;
}

function buildStrip(sessionDate) {
  const base = parseIsoDate(sessionDate);
  if (!base) return [sessionDate];
  const offsets = [-2, -1, 0, 1, 2];
  return offsets.map((offset) => {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    return offset === 0 ? sessionDate : toIsoDate(d);
  });
}

export function datePicker(state, workshop, dispatch) {
  const recommended = workshop.sessionDate;
  const selectedDate = state.scheduling ? state.scheduling.selectedDate : null;
  const dates = buildStrip(recommended);

  const picker = el('div', { className: 'kd-date-picker' });
  const strip = el('div', { className: 'kd-date-strip', role: 'group', 'aria-label': 'Choose a date' });

  for (const iso of dates) {
    const isRecommended = iso === recommended;
    const isSelected = selectedDate === iso;
    const { weekday, day } = formatDayLabel(iso);

    const className = ['kd-date', isRecommended ? 'kd-date--recommended' : '', isSelected ? 'kd-date--selected' : '']
      .filter(Boolean).join(' ');

    const children = [
      el('span', { className: 'kd-date-weekday', textContent: weekday }),
      el('span', { className: 'kd-date-day', textContent: day }),
    ];
    if (isRecommended) {
      children.push(el('span', { className: 'kd-date-recommended-tag', textContent: 'Recommended' }));
    }

    strip.appendChild(
      el('button', {
        type: 'button',
        className,
        'aria-pressed': String(isSelected),
        'aria-label': isRecommended ? `${iso} (Recommended)` : iso,
        dataset: { testid: isRecommended ? 'date-recommended' : 'date-option', date: iso },
        onClick: () => dispatch({ type: 'SELECT_DATE', date: iso }),
      }, children),
    );
  }

  picker.appendChild(strip);
  return picker;
}

export function workshopPass(pass, attendee) {
  const article = el('article', { className: 'kd-pass', dataset: { testid: 'workshop-pass' } });

  const header = el('div', { className: 'kd-pass-header' }, [
    el('span', { className: 'kd-pass-badge', textContent: 'Workshop Pass' }),
    el('span', { className: 'kd-pass-check', 'aria-hidden': 'true', textContent: '✓' }),
  ]);
  article.appendChild(header);

  article.appendChild(el('h3', { className: 'kd-pass-title', textContent: pass.title, dataset: { testid: 'pass-title' } }));
  article.appendChild(el('p', { className: 'kd-pass-studio', textContent: pass.studio, dataset: { testid: 'pass-studio' } }));

  const detailRow = (label, value, testid) =>
    el('div', { className: 'kd-pass-detail-row' }, [
      el('dt', { className: 'kd-pass-detail-label', textContent: label }),
      el('dd', { className: 'kd-pass-detail-value', textContent: value, dataset: { testid } }),
    ]);

  article.appendChild(
    el('dl', { className: 'kd-pass-details' }, [
      detailRow('Date', pass.date, 'pass-date'),
      detailRow('Time', pass.time, 'pass-time'),
      detailRow('Location', pass.location, 'pass-location'),
    ]),
  );

  const attendeeBlock = el('div', { className: 'kd-pass-attendee', dataset: { testid: 'pass-attendee' } });
  attendeeBlock.appendChild(el('span', { className: 'kd-pass-attendee-label', textContent: 'Attendee' }));
  attendeeBlock.appendChild(renderIdentity(attendee, 'sm'));
  article.appendChild(attendeeBlock);

  return article;
}

// ---------------------------------------------------------------------------
// Screen renderers
// ---------------------------------------------------------------------------

export function renderDiscover(state, dispatch) {
  const { workshops, searchTerm, activeMedium } = state;

  const chips = deriveFilterChips(workshops);
  const filtered = filterWorkshops(workshops, searchTerm, activeMedium);
  const count = resultCount(filtered);
  const isEmpty = filtered.length === 0;

  const screen = el('section', { className: 'kd-discover', 'aria-labelledby': 'discover-heading' });

  // Location heading
  screen.appendChild(
    el('header', { className: 'kd-location-heading' }, [
      el('h1', { id: 'discover-heading', className: 'kd-screen-title', textContent: 'Find a workshop near you' }),
      el('p', { className: 'kd-location', textContent: LOCATION_CONTEXT, dataset: { testid: 'discover-location' } }),
    ]),
  );

  // Search bar — always shown
  const bar = el('div', { className: 'kd-search-bar' });
  bar.appendChild(el('label', { htmlFor: 'discover-search', for: 'discover-search', className: 'kd-visually-hidden', textContent: 'Search medium or area' }));
  bar.appendChild(el('input', {
    id: 'discover-search',
    type: 'search',
    className: 'kd-search-input',
    placeholder: 'Search medium or area',
    value: searchTerm,
    onInput: (e) => dispatch({ type: 'SET_SEARCH', term: e.target.value }),
  }));
  screen.appendChild(bar);

  // Filter chips — always shown
  const chipRow = el('div', { className: 'kd-chips', role: 'group', 'aria-label': 'Filter workshops by medium' });
  for (const chip of chips) {
    const isActive = chip === activeMedium;
    chipRow.appendChild(
      el('button', {
        type: 'button',
        className: `kd-chip${isActive ? ' kd-chip--active' : ''}`,
        'aria-pressed': String(isActive),
        textContent: chip,
        onClick: () => dispatch({ type: 'SET_MEDIUM', medium: chip }),
      }),
    );
  }
  screen.appendChild(chipRow);

  // Result count
  screen.appendChild(
    el('p', { className: 'kd-result-count', textContent: `${count} ${count === 1 ? 'workshop' : 'workshops'}`, dataset: { testid: 'discover-count' } }),
  );

  // Workshop list or empty state
  if (isEmpty) {
    screen.appendChild(
      el('p', { className: 'kd-empty-inline', textContent: 'No workshops match your search', dataset: { testid: 'discover-empty' } }),
    );
  } else {
    const list = el('div', { className: 'kd-list' });
    for (const workshop of filtered) {
      list.appendChild(workshopCard(state, workshop, dispatch));
    }
    screen.appendChild(list);
  }

  return screen;
}

export function renderPairs(state, dispatch) {
  const screen = el('div', { className: 'kd-pairs' });

  const pairingWorkshop = state.workshops.find((w) => w.id === state.pairingWorkshopId);

  if (state.pairingWorkshopId === null || pairingWorkshop === undefined) {
    const section = el('section', { className: 'kd-empty-state', dataset: { testid: 'pairs-empty' } });
    section.appendChild(el('h2', { className: 'kd-empty-title', textContent: 'No workshop selected' }));
    section.appendChild(el('p', { className: 'kd-empty-body', textContent: 'Pick a workshop and tap Find a pair to see who wants to join you.' }));
    screen.appendChild(section);
    return screen;
  }

  // Selected workshop header
  screen.appendChild(
    el('header', { className: 'kd-workshop-header', textContent: `Pairing for ${pairingWorkshop.title} · ${pairingWorkshop.studio}`, dataset: { testid: 'pairs-workshop-header' } }),
  );

  // Interested list
  const interestedWorkshops = state.interestedList
    .map((id) => state.workshops.find((w) => w.id === id))
    .filter((w) => w !== undefined);

  const interestedSection = el('section', { className: 'kd-section', 'aria-labelledby': 'pairs-interested-heading' });
  interestedSection.appendChild(el('h2', { id: 'pairs-interested-heading', className: 'kd-heading', textContent: 'Your interested list', dataset: { testid: 'pairs-interested-heading' } }));

  if (interestedWorkshops.length > 0) {
    const ul = el('ul', { className: 'kd-interested-list', dataset: { testid: 'pairs-interested-list' } });
    for (const workshop of interestedWorkshops) {
      ul.appendChild(
        el('li', { className: 'kd-interested-item', dataset: { testid: 'pairs-interested-item' } }, [
          el('span', { className: 'kd-interested-title', textContent: workshop.title }),
          el('span', { className: 'kd-interested-studio', textContent: workshop.studio }),
        ]),
      );
    }
    interestedSection.appendChild(ul);
  } else {
    interestedSection.appendChild(
      el('p', { className: 'kd-empty-hint', textContent: 'Nothing yet — tap Find a pair on a workshop.', dataset: { testid: 'pairs-interested-empty' } }),
    );
  }
  screen.appendChild(interestedSection);

  screen.appendChild(el('p', { className: 'kd-privacy-note', textContent: 'Names & photos stay hidden until you both accept.', dataset: { testid: 'pairs-privacy-note' } }));

  // Incoming requests — always shown
  const incomingRequests = state.pairingRequests.filter(
    (r) => r.status === 'incoming' && r.toUserId === state.currentUserId && r.workshopId === state.pairingWorkshopId,
  );
  if (incomingRequests.length > 0) {
    const section = el('section', { className: 'kd-section', 'aria-labelledby': 'pairs-incoming-heading' });
    section.appendChild(el('h2', { id: 'pairs-incoming-heading', className: 'kd-heading', textContent: incomingRequests.length === 1 ? 'Incoming request' : 'Incoming requests', dataset: { testid: 'pairs-incoming-heading' } }));
    const cardList = el('div', { className: 'kd-card-list' });
    for (const request of incomingRequests) {
      cardList.appendChild(pairingRequestCard(state, request, dispatch));
    }
    section.appendChild(cardList);
    screen.appendChild(section);
  }

  // Suggested neighbors — always shown
  const neighbors = state.neighbors.filter((n) => n.sharedWorkshopIds.includes(state.pairingWorkshopId));
  const neighborSection = el('section', { className: 'kd-section', 'aria-labelledby': 'pairs-neighbors-heading' });
  neighborSection.appendChild(el('h2', { id: 'pairs-neighbors-heading', className: 'kd-heading', textContent: 'Neighbors interested in the same workshops', dataset: { testid: 'pairs-neighbors-heading' } }));

  if (neighbors.length > 0) {
    const cardList = el('div', { className: 'kd-card-list' });
    for (const neighbor of neighbors) {
      cardList.appendChild(neighborCard(state, neighbor, dispatch));
    }
    neighborSection.appendChild(cardList);
  } else {
    neighborSection.appendChild(el('p', { className: 'kd-empty-hint', textContent: 'No neighbors yet for this workshop.', dataset: { testid: 'pairs-neighbors-empty' } }));
  }
  screen.appendChild(neighborSection);

  return screen;
}

function emptyFallback(testid, title, body, dispatch) {
  const screen = el('section', { className: testid === 'schedule-empty' ? 'kd-schedule' : 'kd-confirmation', 'aria-labelledby': `${testid}-heading`, dataset: { testid } });
  screen.appendChild(
    el('div', { className: 'kd-empty-state' }, [
      el('h1', { id: `${testid}-heading`, className: 'kd-empty-title', textContent: title }),
      el('p', { className: 'kd-empty-body', textContent: body }),
      el('button', { type: 'button', className: 'kd-back-button', textContent: 'Back to Discover', onClick: () => dispatch({ type: 'NAVIGATE', screen: 'discover' }) }),
    ]),
  );
  return screen;
}

export function renderSchedule(state, dispatch, timeSlots) {
  const { scheduling } = state;

  if (!scheduling) {
    return emptyFallback('schedule-empty', 'Nothing to schedule yet', 'Pick a workshop from Discover to start scheduling a session.', dispatch);
  }

  const workshop = state.workshops.find((w) => w.id === scheduling.workshopId);
  if (!workshop) {
    return emptyFallback('schedule-empty', 'Nothing to schedule yet', 'Pick a workshop from Discover to start scheduling a session.', dispatch);
  }

  const isSolo = scheduling.attendanceMode === 'solo';
  const isConfirmed = scheduling.confirmed;
  const canInvitePair = isSolo && !isConfirmed;

  const selectedSlot = scheduling.selectedSlot ? timeSlots.find((s) => s.id === scheduling.selectedSlot) : undefined;
  const bothSelected = Boolean(scheduling.selectedDate) && Boolean(selectedSlot);
  const confirmLabel = bothSelected && scheduling.selectedDate && selectedSlot
    ? `Confirm ${formatDateLabel(scheduling.selectedDate)}, ${selectedSlot.time}`
    : 'Confirm';

  const screen = el('section', { className: 'kd-schedule', 'aria-labelledby': 'schedule-heading' });

  screen.appendChild(
    el('header', { className: 'kd-schedule-header' }, [
      el('h1', { id: 'schedule-heading', className: 'kd-screen-title', textContent: 'Schedule your session' }),
      el('p', { className: 'kd-schedule-summary', textContent: `${workshop.title} · ${workshop.studio}`, dataset: { testid: 'schedule-summary' } }),
    ]),
  );

  const mode = el('div', { className: `kd-mode ${isSolo ? 'kd-mode--solo' : 'kd-mode--paired'}`, dataset: { testid: 'schedule-mode' } });
  if (isSolo) {
    mode.appendChild(el('span', { className: 'kd-mode-label', textContent: 'ATTENDING SOLO' }));
    mode.appendChild(el('span', { className: 'kd-mode-detail', textContent: 'Just you. You can invite a pair anytime before the session.' }));
  } else {
    mode.appendChild(el('span', { className: 'kd-mode-label', textContent: 'ATTENDING AS A PAIR' }));
    mode.appendChild(el('span', { className: 'kd-mode-detail', textContent: 'You and your pair are scheduled together for this session.' }));
  }
  screen.appendChild(mode);

  if (canInvitePair) {
    screen.appendChild(
      el('button', { type: 'button', className: 'kd-invite-button', textContent: 'Invite a pair', dataset: { testid: 'schedule-invite' }, onClick: () => dispatch({ type: 'INVITE_PAIR' }) }),
    );
  }

  const dateSection = el('div', { className: 'kd-section' });
  dateSection.appendChild(el('h2', { className: 'kd-section-title', textContent: 'Choose a date' }));
  dateSection.appendChild(datePicker(state, workshop, dispatch));
  screen.appendChild(dateSection);

  // Time slots — always shown
  const timeSection = el('div', { className: 'kd-section' });
  timeSection.appendChild(el('h2', { className: 'kd-section-title', textContent: 'Choose a time' }));
  timeSection.appendChild(timeSlotPicker(state, timeSlots, dispatch));
  screen.appendChild(timeSection);

  if (scheduling.validationMessage) {
    screen.appendChild(el('p', { className: 'kd-validation', role: 'alert', textContent: scheduling.validationMessage, dataset: { testid: 'schedule-validation' } }));
  }

  screen.appendChild(
    el('button', { type: 'button', className: 'kd-confirm-button', textContent: confirmLabel, dataset: { testid: 'schedule-confirm' }, onClick: () => dispatch({ type: 'CONFIRM_SCHEDULE' }) }),
  );

  return screen;
}

export function renderConfirmation(state, dispatch) {
  const pass = state.workshopPass;

  if (!pass) {
    return emptyFallback('confirmation-empty', 'No confirmed session yet', 'Once you confirm a workshop session, your pass will show up here.', dispatch);
  }

  const currentUser = state.users[state.currentUserId];
  const attendee = currentUser
    ? { displayName: currentUser.name, photo: currentUser.photo, isRevealed: true }
    : { displayName: 'You', photo: null, isRevealed: true };

  const identityShared = pass.identityShared;

  const screen = el('section', { className: 'kd-confirmation', 'aria-labelledby': 'confirmation-heading' });

  screen.appendChild(
    el('header', { className: 'kd-confirmation-header' }, [
      el('span', { className: 'kd-eyebrow', textContent: 'Confirmed' }),
      el('h1', { id: 'confirmation-heading', className: 'kd-confirmation-title', textContent: "You're all set" }),
      el('p', { className: 'kd-confirmation-subtitle', textContent: 'Your workshop pass is ready. Save it for the day of the session.' }),
    ]),
  );

  screen.appendChild(workshopPass(pass, attendee));

  const actions = el('div', { className: 'kd-confirmation-actions' });

  // Share identity — always shown
  actions.appendChild(
    el('button', {
      type: 'button',
      className: 'kd-share-button',
      textContent: identityShared ? 'Identity shared' : 'Share my identity',
      disabled: identityShared ? 'true' : undefined,
      'aria-disabled': String(identityShared),
      dataset: { testid: 'confirmation-share' },
      onClick: () => dispatch({ type: 'SHARE_IDENTITY' }),
    }),
  );

  actions.appendChild(
    el('button', {
      type: 'button',
      className: 'kd-back-button',
      textContent: 'Back to Discover',
      dataset: { testid: 'confirmation-back' },
      onClick: () => dispatch({ type: 'NAVIGATE', screen: 'discover' }),
    }),
  );

  screen.appendChild(actions);
  return screen;
}
