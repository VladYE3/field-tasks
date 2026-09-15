# Field Tasks — React Native intern test task

**Candidate code: SA-RN-4676**

An offline-first mobile app for field technicians to create, plan, track, and review daily work tasks — with locations, photo attachments, status changes, a persistent history log, local reminders, and mock-server synchronization.

Built with **Expo SDK 57 (React Native 0.86) + TypeScript**.

## Main features

- **Task CRUD** — create/edit tasks with title, description, due date & time, location, attachments, and status (`New`, `In Progress`, `Completed`, `Cancelled`). Required-field validation with per-field error messages.
- **Task list** — search by title, filter by status, sort by date added / due date / status; pull-to-refresh; clear empty state.
- **Task details** — full info, attachment thumbnails, per-task history, status actions (Start / Complete / Cancel / Reopen), delete with confirmation.
- **Attachments** — pick from gallery or take a photo; files are copied into the app's document directory so they survive restarts; missing/unreadable files render a graceful "File unavailable" tile.
- **Push notifications** — a local notification is scheduled 30 minutes before the due time. Permission handling with user-friendly messages.
- **Map** — tasks with coordinates are shown as markers on a Leaflet map (OpenStreetMap, no API key needed); tapping a marker opens the task. Location entry: manual address (required) + predefined site list or manual coordinates (real geocoding was optional and is not implemented).
- **History log** — creation, edits, status changes, attachment add/remove, deletions, and sync events with timestamps; persisted locally, visible in a dedicated tab.
- **Offline + sync** — everything works offline and persists across restarts. When connectivity returns, local changes sync with a json-server mock REST API. Per-task sync status: `Pending Sync` / `Synced` / `Sync Failed`.
- **UI/UX** — light & dark theme toggle, loading/empty/error/success states, readable text, 44px+ tap targets.
- **Bonus** — search/filtering, unit tests for validation and sync-merge logic.

## Getting started

```bash
npm install
npm start          # Metro; open in Expo Go or a dev build
```

Requirements: Node 20+, Expo CLI (via `npx`).

## Running the mock sync server

```bash
npm run server     # json-server on http://localhost:3001, data in server/db.json
```

Sample data ships separately: run `npm run server:seed` to reset the database to the two
seed tasks in `server/db.seed.json` (plain `npm run server` starts with an empty database).

- Android emulator: the default URL `http://10.0.2.2:3001` works out of the box.
- Physical device: find your computer's LAN IP (`ipconfig` / `ifconfig`) and enter `http://<LAN-IP>:3001` in **Settings → Mock sync server** inside the app.

## Building the APK (EAS)

```bash
npm install -g eas-cli
eas login          # free Expo account required
eas build --platform android --profile production
```

`eas.json` builds a universal **APK** (`buildType: "apk"` in the production profile). The build runs in the EAS cloud; the finished APK is downloaded from the build page (or `eas build --platform android --profile production --local` if you have Android SDK/JDK locally).

## Architecture

```
src/
  api/          fetch wrapper with timeout + ApiError (used by sync)
  components/   reusable UI (TaskCard, FilterBar, SyncBanner, AttachmentSection, ...)
  constants/    candidate code, status metadata, predefined locations, demo delays
  navigation/   React Navigation: bottom tabs (Tasks, Map, History, Settings) + stack
  screens/      TaskList, TaskForm, TaskDetail, Map, History, Settings
  services/     attachmentService, notificationService, syncService, networkService
  storage/      AsyncStorage repositories (tasks, history, settings)
  store/        zustand store — single source of truth, wires storage + services
  theme/        light/dark palettes + ThemeProvider
  types/        shared TypeScript models
  utils/        validation, date formatting, id generation
assets/map.html Leaflet page rendered in a WebView
server/db.json  json-server seed data
__tests__/      unit tests (validation, last-write-wins merge)
```

- **State management** — zustand: one store holds tasks, history, settings, connectivity and sync state. Screens subscribe with selectors; UI stays thin.
- **Storage** — AsyncStorage repositories; every mutation is written immediately, so the app is fully usable offline and survives restarts. The history log is capped at 500 entries.
- **Sync** — every task carries `syncStatus` (`pending`/`synced`/`failed`) and `updatedAt`. `syncService` pushes dirty tasks (PUT, POST on 404, DELETE for tombstones), then pulls the remote list and merges. NetInfo triggers an automatic sync when connectivity is restored; manual "Sync now" is available too. **Conflict resolution is last-write-wins** by `updatedAt`; the server copy wins ties, so a fresh install converges toward the server. Deleted tasks become tombstones that are purged locally after the server accepts the deletion.
- **Notifications** — `expo-notifications`. On create/update the old reminder is cancelled and a new one is scheduled 30 minutes before the due time (Android notification channel `task-reminders`). **Fallback:** if the due time is less than 30 minutes away (but still in the future), the reminder is scheduled 1 minute before the due time instead, and the form shows an explanatory notice. A past due time is rejected by validation. **Demo mode:** the task detail screen has "Send test notification (demo)" which runs the same scheduling pipeline with a ~30-second delay (the minimum of the 30–60 s demo window required by the assignment) so the flow can be verified without waiting 30 minutes.
- **Map** — `react-native-webview` renders a local Leaflet HTML asset; the RN side injects task markers via `injectedJavaScript` and receives marker taps through `postMessage`. Map tiles require internet; the task chips below the map work offline.
- **Attachments** — picked/captured images are copied from the temporary `content://` URI into the app's document directory (`expo-file-system`), and metadata (name, MIME type, size, timestamp) is stored on the task so attachments reappear after restart.

## Validation rules

Title and description required (title ≤ 120 chars), due date required and must be in the future, location address required. Coordinates are optional and, when present, must parse as numbers. Due times under 30 minutes away produce a non-blocking notice (see notification fallback above).

## Known limitations & trade-offs

- Real geocoding and remote push are out of scope; reminders are local notifications.
- Map tiles need internet (OpenStreetMap); markers and task chips still work offline.
- Conflict resolution is deliberately simple last-write-wins — no field-level merging.
- Only image attachments are supported (PDF/other files were a plus, not required).
- Due date/time entry uses text inputs (`YYYY-MM-DD`, `HH:MM`) to avoid an extra native dependency.
- `usesCleartextTraffic` is enabled in `app.json` intentionally: the mock json-server is plain HTTP on a local network. For a production backend over HTTPS this flag should be removed.

## Tests

```bash
npm test    # jest: validation rules + last-write-wins merge logic (11 tests)
```

## AI/tooling disclosure

AI coding assistants were used during development for scaffolding and boilerplate generation (project structure, screen components, documentation drafts) under human review. All core logic — data model, sync merge, notification scheduling, validation — was reviewed, adjusted, and is explainable line by line.

## Candidate code

**SA-RN-4676** — shown in the app (Settings → About), this README, and the video demonstration.
