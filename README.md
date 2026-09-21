# Presensi — Frontend

Academic attendance portal for the walk-through attendance system. Built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui. The application uses the [ASP.NET Core backend](https://github.com/MeinFinalProject/backend); face recognition and observation synchronization run on the [Edge client](https://github.com/MeinFinalProject/edge-client).

**Language convention:** documentation, source identifiers, and browser URLs use English. User-facing labels, instructions, validation messages, and date formatting use Bahasa Indonesia.

## Local development

Requirements: Node.js 24, a configured .NET 10 backend and PostgreSQL database, and a trusted ASP.NET Core HTTPS development certificate. The supplied setup targets Windows.

Start the backend from its repository:

```shell
dotnet run --project src/Ta.Backend --launch-profile https
```

Start the frontend from this repository:

```shell
npm ci
npm run dev
```

If PowerShell blocks the `npm.ps1` shim, use `npm.cmd` for these commands (for example, `npm.cmd run dev`); no execution-policy change is needed.

Open **http://localhost:5173/login**. Vite listens on localhost and proxies `/api` to **https://localhost:7143**, with TLS verification enabled. Node uses the operating system certificate store through `--use-system-ca`.

Sign in with an approved backend account. To create the first administrator, follow the backend README and run its `scripts/New-Administrator.ps1` once. The frontend contains no demo accounts, default passwords, or administrator bootstrap token.

The process environment variable `BACKEND_URL` can override the development proxy target. Database credentials, biometric model configuration, and bootstrap credentials belong to the backend. Never put secrets in `VITE_*` variables: they are exposed to browser code.

## Workflows

| Role          | Available workflows                                                                                                                                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrator | Manage academic reference data and staff accounts; approve student accounts; assign advisors; review course registrations and biometric enrollments; manage devices, credentials, and room assignments; inspect Edge observations and attendance decisions. |
| Lecturer      | View assigned classes; create, edit, cancel, and close actual teaching sessions; view rosters; correct attendance with an audited reason and revision checks; read class summaries; review advised students' course registrations.                          |
| Student       | Register an account; prepare and submit a course registration; view actual sessions; upload biometric samples with consent; submit or revoke enrollment; read attendance history and percentages; update profile and password.                              |

Initial setup follows the academic workflow: create reference data and lecturer accounts, approve students and assign advisors, submit and approve course registrations, schedule sessions, then enroll and verify student biometrics. Edge devices need a valid credential, an effective room assignment, and a compatible gallery before attendance testing.

Biometric enrollment uses `POST /api/v1/biometric-enrollments/{id}/samples/upload` with multipart form data. It requires 12 distinct JPEG/PNG photos, at least two for each orientation: frontal, left, right, up, and down. Each photo must be at most 5 MiB, with dimensions between 112 and 2048 pixels. The backend performs extraction; the browser does not generate embeddings. Counts advance only after the server stores a sample. Original photos are not retained by the backend, so identity approval requires the institution's supervised verification process.

### Guided camera enrollment

After consent, open the draft and choose **Gunakan kamera**. Activate the camera, follow the suggested orientation, capture a frame, then review or retake it before choosing **Proses dan simpan foto**. Suggestions resume from the server's saved sample counts; all five orientations need at least two samples, and submission still requires exactly 12 distinct samples. **Unggah foto** remains available at any time before processing starts.

Camera access requires HTTPS or localhost and explicit browser permission. Only video is requested. The preview is mirrored for positioning; the JPEG sent for extraction retains the camera's original orientation and is limited to 1280 pixels on its longest edge. Camera tracks stop after capture, on cancellation, on closing/changing the workflow, or when the tab is hidden, including when a pending permission request resolves late. Preview URLs are released and photos are not stored in browser persistence. Pose prompts are guidance, not automatic pose or liveness validation. See [MDN: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

### Audit trail and attendance exports

Administrators can open **Riwayat audit** to filter recorded actions by type, exact actor/resource IDs, and a WIB time range. Filtering happens on the backend before pagination. Details show the actor, timestamp, reason, and available before/after values. Actor names reflect the current account profile; immutable actor IDs remain visible. The interface covers existing backend audit events, not every read or user action.

Assigned lecturers and administrators can download CSV from a session roster or class summary. Each export performs a fresh authorized API read and includes report context, export time, and the backend's attendance values. Ongoing sessions do not enter summary percentages. Unavailable percentages remain empty, and cancelled sessions are excluded from summaries. Files use UTF-8 with BOM, quoted fields, and formula-prefix neutralization informed by [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection). Exports are generated in the browser and are not retained by the server; recipients should handle downloaded student data appropriately.

### Student context

The student overview shows course registration for active current semesters, missing advisor assignment, the latest biometric enrollment and saved progress, and the number of compatible active samples already on the server. A replacement draft does not hide still-active samples from a previous approved enrollment. These states do not assert gallery installation or device availability.

Students can check ongoing-session attendance from the overview or **Presensi saya**. The page refreshes every 30 seconds while visible and offers a manual refresh. Pending attendance is distinct from confirmed attendance and completed-session absence; offline synchronization is explained without claiming that an observation has reached the server. Percentages continue to include completed sessions only.

## Browser routes

Browser routes are separate from the versioned API. Their definitions and URL builders live in `src/config/paths.ts`.

| URL                                | Purpose                                       |
| ---------------------------------- | --------------------------------------------- |
| `/`                                | Role-specific overview                        |
| `/login`, `/register`              | Sign-in and student registration              |
| `/sessions`, `/sessions/:id`       | Session list and staff attendance roster      |
| `/classes/:id/attendance`          | Class attendance summary                      |
| `/course-registrations`            | Student submissions and advisor decisions     |
| `/my-attendance`                   | Student attendance history                    |
| `/biometric-enrollments`           | Photo enrollment and administrator review     |
| `/academic`, `/accounts`           | Academic data and account administration      |
| `/devices`, `/attendance-activity` | Device administration and observation review  |
| `/audit-trail`                     | Administrator audit filters and event details |
| `/settings`                        | Account profile and password                  |

Navigation and route guards follow the authenticated role returned by `/auth/me`. Backend authorization remains authoritative for every request.

## Architecture

The project is a feature-oriented single-page application. There is no universal React folder standard; these boundaries are chosen to keep academic workflows understandable without introducing unnecessary layers.

```text
src/
  app/
    app.tsx              Application composition
    providers.tsx        Authentication, query cache, error boundary
    router.tsx           Lazy-loaded routes and role guards
    layout.tsx           Navigation and page shell
    error-boundary.tsx   Recoverable rendering failure screen
  config/
    paths.ts             Canonical English browser URLs
  components/
    ui/                  shadcn/ui primitives
    shared.tsx           Reusable forms, tables, dialogs, and states
  features/
    academic/            Reference data and shared catalog queries
    accounts/            Account approval and advisor assignment
    attendance/          Rosters, corrections, and summaries
    audit/               Administrator audit filters and details
    auth/                Authentication, registration, and settings
    biometrics/          Enrollment page, sample editor, photo validation
    dashboard/           Role-specific overview
    devices/             Device configuration and observation review
    registrations/       Course registration workflow
    sessions/            Session list and editor
  lib/                   API client, wire contracts, formatting, utilities
tests/
  unit/                  Session, API, time, and upload boundaries
  e2e/                   Browser workflows against the real backend
  backend-host/          Isolated PostgreSQL integration host
```

Conventions:

- `app/` composes features. Shared `components/`, `config/`, and `lib/` do not import application pages or feature implementations.
- Feature-specific components stay next to their page; larger editors are separate files. Create additional subdirectories only when the feature needs them.
- Authentication context and academic catalog queries are intentionally shared across related workflows. This is a pragmatic feature-based structure, not a claim of fully isolated modules.
- Use direct imports and the `@/` source alias. TypeScript strict mode, linting, formatting, tests, and the production build are part of the development checks.
- TanStack Query owns server data. Component state owns local form/UI state. Mutations are not retried automatically, and attendance is not updated optimistically.
- Wire contracts retain the backend's `snake_case` names. UI code should not invent server fields, statuses, or permissions.
- Design tokens and shared layout styles live in `src/index.css`; reusable primitives live in `components/ui/`. Mobile attendance uses a compact readable presentation of the same server data.

### References

These are design references, not a certification or a requirement to copy every folder:

- [React: Thinking in React](https://react.dev/learn/thinking-in-react) — component responsibilities, minimal state, and one-way data flow.
- [Bulletproof React: project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) — feature-oriented organization and application/shared boundaries; only the needed parts are adopted.
- [shadcn/ui: Vite installation](https://ui.shadcn.com/docs/installation/vite) — component source ownership, Tailwind integration, and TypeScript/Vite aliases.
- [React Router: declarative routing](https://reactrouter.com/start/declarative/routing) — nested layouts, dynamic segments, and client-side navigation.
- [Vite: features](https://vite.dev/guide/features.html) — TypeScript integration and production bundling; type checking is run explicitly before bundling.

## Integration and data handling

The opaque human session token is stored in `sessionStorage` for the current tab. Expiration and authenticated 401 responses clear the session and query cache. Requests use an explicit bearer header and omit ambient cookies. Device credentials returned by creation/rotation are displayed once and are not persisted by the frontend.

Session forms display WIB and send an explicit `+07:00` offset. The backend normalizes timestamps to UTC. Attendance percentages come directly from the backend: unavailable results are not shown as zero. A received Edge observation does not necessarily count as academic attendance, and enabled device access is not an online status.

The paired backend must include the advisor-scoped `GET /api/v1/academic/advisees` endpoint and UTC normalization for session creation, filtering, and optional manual check-in timestamps. Product completion also requires `GET /api/v1/biometric-enrollments/my-status`, the additive `ongoing_sessions` attendance field, and audit filters/current actor names. These changes have backend regression tests and require no new migration. Existing authorized roster and summary endpoints supply CSV exports; no parallel reporting API is introduced.

## Verification

```shell
npm run lint
npm run format:check
npm test
npm run build
npm run test:e2e
```

CI runs lint, formatting, unit tests, and the production build. Local end-to-end tests require Microsoft Edge, .NET 10, the backend checkout at `../TA_backend`, and the backend user secret `Tests:Postgres` pointing to **ta_backend_test**.

The test host validates the database name, creates a random schema using the backend fixture, applies migrations, starts the real HTTPS API on port 7243, and drops the schema on teardown. Playwright builds the frontend and serves the production bundle through Vite preview on port 5174, using the same verified HTTPS proxy. Test clients pace real API requests to respect the shared IP rate limit; backend limits remain enabled. Do not run multiple E2E suites simultaneously.

For another backend location, set `BACKEND_REPOSITORY` for the runtime and the MSBuild `BackendRepository` property for the project reference. Disposable test credentials travel through a private process pipe; they are not stored in source or persisted browser state. Fixtures are labeled as test data and are never inserted into the development database. Screenshots are written to the Git-ignored `.local/screenshots/` directory.

Browser tests cover account registration/approval, course registration across roles, attendance corrections and revision conflicts, CSV downloads, student percentages and ongoing attendance, WIB scheduling, devices and room assignments, audit filtering/details, biometric consent and invalid-image rejection, role restrictions, connection failures, and mobile navigation. Camera tests use Chromium's synthetic camera to exercise capture, retake, track shutdown, and real native extraction rejection without collecting a person's biometric data. Unit tests cover camera lifecycle/permission failures and CSV formula handling. Actual face recognition accuracy and a full enrollment with consenting users' photos require separate hardware testing.

## Production and current scope

`npm run build` produces `dist/`. Serve it over HTTPS with an SPA fallback to `index.html`, and reverse-proxy `/api` to the backend on the same origin. Vite's development server and `npm run preview` are not production servers. For local verification, preview serves the built assets and inherits the development API proxy and TLS validation.

Configure production response headers, including a content security policy for same-origin scripts, fonts, and connections; allow `blob:` for local image previews; restrict framing with `frame-ancestors 'none'`; set `object-src 'none'`, `base-uri 'self'`, and `X-Content-Type-Options: nosniff`. Account for Radix's inline layout styles in the style policy. Enable HSTS after HTTPS is configured. Do not log Authorization headers or credential responses. Allow camera access only from the application origin with `Permissions-Policy: camera=(self), microphone=()`. The app has no service worker or persistent academic-data cache.

This stage prioritizes actual sessions and approval workflows. Recurring schedule generation, PDF/XLSX report formats, email password recovery, and push notifications are not implemented. Full device heartbeat and gallery-install acknowledgments remain a separate backend/Edge feature; an active sample count is not proof of device readiness. Registration, enrollment, and session lists follow backend limits and show a notice when the limit is reached; accounts, students, observations, and audit records support pagination. The thesis's 38-hour disciplinary background is outside the prototype's scope.
