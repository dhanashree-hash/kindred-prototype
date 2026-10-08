# Kindred — Product Requirements Document

**Version:** 1.0  
**Type:** Vanilla JS Prototype  
**Status:** Active

---

## 1. Product Overview

Kindred is a **Workshop Pairing app** that helps people find a creative partner to attend workshops together. Users browse local workshops, express interest, send and receive pairing requests with nearby neighbors, schedule sessions, and confirm attendance — all while preserving privacy until both parties mutually agree to connect.

### Goal

To reduce the social friction of attending creative workshops alone by giving people a simple, privacy-first way to find a compatible partner before they walk in the door.

### Target User

Someone who wants to attend a local creative workshop (ceramics, painting, photography, etc.) but prefers to go with a like-minded partner rather than solo. They are comfortable with a lightweight, mobile-style web app.

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Vanilla JavaScript (ES Modules) |
| Rendering | Direct DOM manipulation — no framework |
| State | Custom Redux-style store + pure reducer |
| Data | Static `data.json` loaded via fetch at startup |
| Styling | Plain CSS |
| Build step | None — runs directly in any modern browser |
| External dependencies | None |

---

## 3. Project Structure

```
kindred-prototype/
├── index.html          App shell
├── styles.css          All application styles
├── data.json           Seed data (workshops, users, neighbors, requests, time slots)
└── js/
    ├── app.js          Entry point — bootstrap, render loop, header, bottom nav
    ├── config.js       App configuration — users, roles, feature switches
    ├── screens.js      Screen renderers — Discover, Pairs, Schedule, Confirmation
    ├── selectors.js    Pure derived-state helpers — filtering, identity resolution
    └── store.js        State container and reducer — all state transitions
```

---

## 4. Running the App

Serve the folder with any static file server:

```bash
# Option A
python3 -m http.server 8080

# Option B
npx serve .
```

Open **http://localhost:8080** in a browser.

> ⚠️ Must be served over HTTP — opening `index.html` as a `file://` URL will fail to load `data.json`.

---

## 5. Application Flow

```
User opens app
      ↓
  Discover Screen
  Browse + search workshops near them
      ↓
  Tap "Find a pair"          OR        Tap "Attend solo"
      ↓                                       ↓
  Pairs Screen                         Schedule Screen
  See neighbors,                       Pick date + time
  send/receive requests                      ↓
      ↓                               Confirmation Screen
  Accept request                       View workshop pass
  Identity revealed
      ↓
  Schedule Screen
  Pick date + time
  (in paired mode)
      ↓
  Confirmation Screen
  View workshop pass
  Optionally share identity
```

---

## 6. Screens & Features

### 6.1 Discover Screen

The home screen. Shows all available workshops near the user with search and filter controls.

| Feature | Description |
|---------|-------------|
| Workshop cards | Each card shows medium, price, title, studio, location, distance, date, time |
| Spots left | Remaining capacity shown when available |
| Search bar | Real-time filter by title, studio, medium, or location |
| Medium filter chips | Quick filter by art medium (Ceramics, Painting, Photography, etc.) + "All" |
| Result count | Live count of matching workshops |
| Find a pair | Adds workshop to interested list and navigates to Pairs screen |
| Attend solo | Starts the scheduling flow in solo attendance mode |
| Price display | Workshop price shown on each card |

---

### 6.2 Pairs Screen

Where users manage pairing interest and connections for a selected workshop.

| Feature | Description |
|---------|-------------|
| Interested list | Workshops the user has expressed interest in pairing for |
| Suggested neighbors | Other users in the area who are also interested in the same workshop |
| Match percentage | Compatibility score shown on each neighbor card |
| Neighbor bio + tags | Short bio and interest tags to help evaluate fit |
| Send pairing request | Send a connection request to a neighbor |
| Request sent state | Button becomes disabled with "Request sent" once sent |
| Incoming requests | Pairing requests received from other users |
| Accept & reveal | Accepting a request reveals the requester's identity |
| Not now | Dismiss an incoming request without revealing identity |
| Privacy note | Reminder that names and photos stay hidden until both accept |

---

### 6.3 Schedule Screen

Where users pick a date and time for their workshop session.

| Feature | Description |
|---------|-------------|
| Workshop summary | Title and studio displayed at the top |
| Attendance mode indicator | Shows whether user is attending solo or as a pair |
| Invite a pair | Available when attending solo — switches mode to paired |
| Date picker | 5-day strip centered on the workshop's recommended session date |
| Recommended date tag | The workshop's original session date is highlighted |
| Time slot picker | Three selectable time slots per day |
| Dynamic confirm label | Confirm button shows selected date and time once both are chosen |
| Validation message | Shown if user taps Confirm without selecting both a date and time |

---

### 6.4 Confirmation Screen

Shown after a successful schedule confirmation.

| Feature | Description |
|---------|-------------|
| Workshop pass | Ticket-style card with title, studio, date, time, and location |
| Attendee block | Displays the current user's identity |
| Share my identity | Reveals the user's real name and photo on the pass |
| Identity shared state | Button becomes disabled with "Identity shared" once tapped |
| Back to Discover | Returns to the main screen |

---

## 7. Navigation

A persistent bottom navigation bar with three tabs:

| Tab | Screen | Always Visible |
|-----|--------|----------------|
| Discover | Browse and search workshops | ✅ |
| Pairs | Manage pairing requests and neighbors | ✅ |
| Schedule | Pick a date and time | ✅ |

The Confirmation screen is reached through the scheduling flow only — it is not a bottom nav destination.

---

## 8. Privacy Model

Kindred is built around a **privacy-first identity system**:

- Every user starts as **"Anonymous neighbor"** with a placeholder avatar
- A user's real name and photo are only revealed when **both parties have mutually accepted** each other's pairing request
- Neither user can see the other's identity until the accept is mutual
- On the Confirmation screen, users can optionally share their identity on their workshop pass

This design removes the social pressure of knowing who you're pairing with before you've both decided to connect.

---

## 9. State Management

The app uses a custom Redux-style store:

- **Pure reducer** — every action returns a new state object, inputs are never mutated
- **Subscribe loop** — all registered subscribers re-render on every dispatch
- **Seed-driven** — initial state is built from `data.json` at startup via `createInitialState()`
- **No side effects in reducer** — all async work happens outside the reducer

### State Shape

```js
{
  currentUserId,       // The active demo user's ID
  users,               // Map of all users { name, photo }
  workshops,           // Array of all workshop objects
  neighbors,           // Array of nearby users with shared interests
  pairingRequests,     // Array of all pairing requests (incoming/outgoing/accepted)
  interestedList,      // Workshop IDs the user has shown interest in
  pairingWorkshopId,   // The currently selected workshop for pairing
  activeScreen,        // 'discover' | 'pairs' | 'schedule' | 'confirmation'
  scheduling,          // Active scheduling session { workshopId, mode, date, slot, confirmed }
  workshopPass,        // Confirmed pass { title, studio, date, time, location, mode }
  searchTerm,          // Current discover search input value
  activeMedium,        // Currently selected medium filter chip
}
```

### Actions

| Action | Description |
|--------|-------------|
| `NAVIGATE` | Switch active screen |
| `SET_SEARCH` | Update the discover search term |
| `SET_MEDIUM` | Update the active medium filter |
| `FIND_PAIR` | Add workshop to interested list, navigate to Pairs |
| `ATTEND_SOLO` | Start scheduling in solo mode |
| `BEGIN_SCHEDULE` | Start scheduling (auto-detects solo or paired mode) |
| `SEND_REQUEST` | Create an outgoing pairing request to a neighbor |
| `ACCEPT_REVEAL` | Accept an incoming request and reveal the requester's identity |
| `DISMISS_REQUEST` | Dismiss an incoming request |
| `INVITE_PAIR` | Upgrade scheduling mode from solo to paired |
| `SELECT_DATE` | Set the selected date in the scheduling session |
| `SELECT_SLOT` | Set the selected time slot |
| `CONFIRM_SCHEDULE` | Validate and confirm the scheduling session, build the workshop pass |
| `SHARE_IDENTITY` | Mark the current user's identity as shared on the pass |

---

## 10. Data Model (`data.json`)

### Top-level Structure

```json
{
  "currentUserId": "user-1",
  "users": { "user-1": { "name": "...", "photo": "..." } },
  "workshops": [ ... ],
  "neighbors": [ ... ],
  "pairingRequests": [ ... ],
  "timeSlots": [ ... ]
}
```

### Workshop Object

```json
{
  "id": "ws-001",
  "title": "Wheel Throwing Basics",
  "studio": "Clay Space SF",
  "medium": "Ceramics",
  "location": "Mission District",
  "distance": "0.4 miles",
  "price": "$65",
  "sessionDate": "2026-11-15",
  "sessionTime": "10:00 AM",
  "spotsLeft": 3
}
```

### Neighbor Object

```json
{
  "id": "n-001",
  "userId": "user-2",
  "matchPercentage": 87,
  "distance": "0.3 miles",
  "bio": "...",
  "interestTags": ["ceramics", "painting"],
  "sharedWorkshopIds": ["ws-001", "ws-004"]
}
```

### Pairing Request Object

```json
{
  "id": "pr-001",
  "workshopId": "ws-001",
  "fromUserId": "user-3",
  "toUserId": "user-1",
  "message": "...",
  "status": "incoming"
}
```

Request status values: `incoming` | `outgoing` | `accepted` | `dismissed`

### Time Slot Object

```json
{ "id": "slot-1", "label": "Morning", "time": "10:00 AM" }
```

---

## 11. Configuration (`config.js`)

All configuration is hardcoded — no environment variables or network dependencies.

| Config | Default | Description |
|--------|---------|-------------|
| `DEMO_USERS` | 306 users | Auto-generated `demo-user-1` through `demo-user-306` |
| `DEFAULT_USER_KEY` | `demo-user-1` | User active at startup |
| `ROLES` | `viewer`, `regular` | Available role options in the header dropdown |
| `DEFAULT_ROLE` | `regular` | Role active at startup |
| `tier` | `paid` | Product tier — all features available |

### Feature Switches

Toggle any feature by editing the `features` object in `js/config.js` and refreshing:

```js
export const features = {
  search: true,             // Discover search bar
  showFilters: true,        // Medium filter chips
  matchPercentage: true,    // % match badge on neighbor cards
  spotsLeft: true,          // Spots remaining on workshop cards
  findAPair: true,          // "Find a pair" button and Pairs screen
  attendSolo: true,         // "Attend solo" button
  suggestedNeighbors: true, // Neighbor suggestions on Pairs screen
  incomingRequests: true,   // Incoming request cards on Pairs screen
  sendPairingRequest: true, // "Send pairing request" on neighbor cards
  identityReveal: true,     // Privacy-first reveal on mutual accept
  invitePair: true,         // "Invite a pair" on Schedule screen
  timeSlots: true,          // Time slot picker on Schedule screen
  shareIdentity: true,      // "Share my identity" on Confirmation screen
  promotionalPricing: false // Discounted pricing display (off by default)
};
```

---

## 12. User & Role Selector

The app header contains two dropdowns for demo purposes:

- **User selector** — switch between any of the 306 demo users; changes the active user identity and their pairing request history
- **Role selector** — switch between `viewer` and `regular`; role is an attribute on the user that can be used for access differentiation

Switching either re-renders the app immediately with the new context.
