**CalorieSnap Pro — proposed improvement plan, revised 19 October 2026**

Implementation status, 19 October 2026: the planned source changes are now implemented. See [implementation and verification](VERIFICATION_2026-10-19.md) for 86 passing tests, clean-cache three-platform exports, live API samples, dependency audit findings, and the physical-device checks still outstanding. The plan below is retained as the pre-implementation proposal; its baseline counts and “not yet performed” statements describe that earlier review, not the final implementation.

This proposal was based on the active Expo app, its screens/components/stores/services, configuration, existing tests, project documentation, installed React Native implementation, and recent commits. The repository documents the Python desktop prototype as inactive; it is outside this plan.

The camera UI change is in `d90c35e`. The latest commit, `cb19992`, adjusts Gemini thinking configuration and response schemas. Keep those AI fixes while addressing the independent preview and navigation problems.

**Evidence and uncertainty after the external review**

The external reviewer confirmed the official React Native and Expo claims, but did not have repository access. That review does not independently verify any local file path, count, commit, or defect. The repository findings below were checked locally again for this revision. Keep these evidence categories separate:

| Category | Meaning in this plan |
| --- | --- |
| Official documentation | A platform behavior supported by a linked React Native or Expo source. |
| Local source evidence | Code, package exports, configuration, or asset bytes inspected in this checkout. This does not prove behavior on a physical phone. |
| Local automated evidence | Existing tests or isolated reproductions using production modules with mocked platform APIs. The mocks and their limits must be stated. |
| Inference awaiting device verification | A proposed explanation of the reported symptom, or a performance concern that has not been reproduced/measured on the target phone. |
| Proposed default | A product or engineering choice to evaluate during implementation; not a platform limit, measured result, or guarantee. |

Rechecked local evidence on 19 October 2026:

| Claim | Evidence and result | Verification limit |
| --- | --- | --- |
| Repository baseline | `git log -2` returned `cb19992` followed by `d90c35e`, matching the commits described above. | This identifies this checkout's history, not a deployed mobile binary. |
| Ten obsolete style references | `rg -n 'StyleSheet\.absoluteFillObject' src` returned 3 in LogMealScreen, 1 in CameraScanner, 3 in NutritionLabelScanner, and 3 in BarcodeScanner. The processing image is at [LogMealScreen.js:508](<G:/Important Projects/calorie meter/src/screens/LogMealScreen.js:508>). | Occurrence counts establish usage, not ten independently reproduced UI failures. |
| Native/web export difference | Installed native version is 0.86.3. [Native StyleSheet exports](<G:/Important Projects/calorie meter/node_modules/react-native/Libraries/StyleSheet/StyleSheetExports.js:110>) include `absoluteFill` and omit `absoluteFillObject`; [web exports](<G:/Important Projects/calorie meter/node_modules/react-native-web/dist/exports/StyleSheet/index.js:173>) include both. | Source/package verification only; the reported device/build has not been inspected. |
| Existing tests | A fresh `npm test` run passed 54/54 with zero failures. `tests/` contains six `*.test.js` files. | Device APIs are mocked. No native image layout, real camera capture, or live Gemini performance was validated. The additional audit reproductions below are not added to the 54-test count. |
| API key in exported backup | An isolated load of the production web database service, using in-memory mocked localStorage and a synthetic key, reproduced that key in `exportAllDataJSON().profile.custom_api_key`. [Web export](<G:/Important Projects/calorie meter/src/services/databaseService.js:749>) serializes the profile directly; [native export](<G:/Important Projects/calorie meter/src/services/databaseService.js:762>) selects the entire profile and serializes it. | Web behavior reproduced with fake data; native path inspected in source. No personal key or device storage was read. |
| Reminder preference reset | With Android notifications mocked and permission set to granted, cancelling then checking in the same module scheduled nothing. Reloading the production module to simulate a fresh process caused four reminders to be scheduled. See [startup logic](<G:/Important Projects/calorie meter/src/services/notificationService.js:239>) and [cancellation](<G:/Important Projects/calorie meter/src/services/notificationService.js:262>). | Reproduces loss of the module flag, not actual OS notification delivery or a physical-device restart. |
| 2.84:1 contrast | Recalculated from the exact [theme tokens](<G:/Important Projects/calorie meter/src/theme/colors.js:8>): foreground `#636366`, background `#1C1C1E`, standard sRGB relative luminance, `(Llighter + 0.05) / (Ldarker + 0.05) = 2.84` rounded. | Applies to that opaque color pair; not a screenshot-based audit of every label, overlay, or control. |
| Weekly summary work | [get7DaySummary](<G:/Important Projects/calorie meter/src/services/databaseService.js:853>) calls getDailySummary for seven days; each daily summary reads meals, workouts, and water. | 21 data-read calls on this path, or 21 SQL queries on native. Web uses in-memory reads. No measured runtime or battery penalty has been established. |

The other findings in section 4 remain source-review observations unless a stronger check is explicitly recorded above. File locations and counts describe this revision and must be refreshed after implementation changes. Public documentation cannot establish whether a private repository finding is true.

**1. The photo problem has a concrete native compatibility defect**

`src/screens/LogMealScreen.js:508` renders the processing photo with `style={StyleSheet.absoluteFillObject}`. The installed native `react-native@0.86.3` exports `absoluteFill`, but does not export `absoluteFillObject`. The intended fill style is therefore missing from this image on native. Its parent centers children, and the image has no other explicit dimensions. The review screen instead gives its image explicit width and height. This difference is consistent with the report that the photo becomes visible after analysis; it is not yet proof of the on-device cause.

The same obsolete property appears ten times across `LogMealScreen`, `CameraScanner`, `NutritionLabelScanner`, and `BarcodeScanner`. Spreading the missing value also silently removes positioning from several overlays. The installed web implementation still exports this property, which can conceal the native defect during browser testing. React Native documents its removal in the [0.85 release notes](https://reactnative.dev/blog/2026/04/07/react-native-0.85#stylesheetabsolutefillobject-removed).

This is a confirmed source-level compatibility bug and the leading explanation for the reported behavior. Final confirmation still requires testing the capture flow on an Android/iOS device. There may also be device-specific decode or orientation delays.

The code already calls `onCaptureStart(photo.uri)` before resizing or contacting Gemini. The first fix should restore this existing preview path, rather than assume the photo is intentionally withheld until AI finishes.

Proposed changes:

- Replace all ten obsolete references with supported positioning styles and verify the camera overlays as well as the processing photo.
- Extract a shared `CapturedPhotoPreview` with explicit layout, image load/error handling, and an accessible fallback.
- Display the captured local photo as soon as the camera returns it. Keep that source visible until a normalized replacement has loaded, so source replacement cannot cause a blank flash.
- Keep the camera unmounted during analysis and after leaving capture.
- Add camera readiness/error handling to photo and label capture; retain a gallery option when camera permission is unavailable.
- Measure shutter-to-capture, capture-to-image-load, resize time, payload size, request attempts, and total result time. Record metadata/timing only, with no image bytes, keys, or meal contents in performance logs.

Completion criteria: a deliberately delayed AI response still shows the actual captured photo throughout processing; portrait/landscape inputs remain correct; the preview has a recoverable error state; the camera releases correctly. The 300 ms preview target below is a proposed measurement target, not evidence of current or guaranteed future performance. Do not declare the reported issue fixed solely because unit tests pass.

**2. Add scans that continue while the user moves around the app**

The current AI calls are asynchronous, but the interface prevents navigation: the scanner returns a dedicated processing screen, meal-mode switching is blocked while busy, and `TabNavigator` hides the bottom tabs throughout `LogMeal`. Switching app tabs also unmounts the previous screen. Scan photos, status, and results currently live in `LogMealScreen`, and its cleanup invalidates the request. Simply enabling the tabs would therefore lose the result.

Proposed user experience:

1. Take a photo and immediately see it with “Preparing your photo”.
2. Choose **Continue using app** to return to the dashboard, or remain on the scan detail view. Leaving the detail view keeps the job running.
3. A compact banner above the bottom navigation shows a real thumbnail and status: “Analyzing lunch…” or “1 meal ready to review”. It occupies only its own touch area.
4. Water logging, workouts, history/date navigation, manual meal entry, and Sage remain available. Additional scans can be queued.
5. When a result is ready, update the banner and optionally give a light haptic. Do not unexpectedly switch screens or add estimated calories to the diary.
6. Tap the banner or scan badge to open a **Scans** inbox. Review/edit the meal, then save it to the intended diary date.
7. A failed job retains its photo and offers **Retry**, **Describe meal**, and **Discard**. Explicit **Cancel scan** stops that job. Back/minimize means keep working.

Proposed implementation:

- Add `useScanStore.js` for job state and `scanService.js` for capture preparation, queue execution, cancellation, and persistence. Start the runner after database initialization, outside screen lifetimes.
- Give every job a stable ID, attempt/version token, captured timestamp, diary date, meal context, photo references, result/edit draft, and error state. Bind the original diary date at capture/enqueue time and display it during review.
- Use explicit states such as preparing, queued, analyzing, ready, failed, cancelled, saving, and saved. Job-specific tokens must guard every resize, success, failure, cancellation, and retry callback.
- As a proposed starting configuration, allow one active photo/label analysis and at most three pending jobs total, including that active job and any preparing/queued jobs. Ready-to-review drafts are persisted separately and do not use an active-analysis slot. Revisit the cap after memory and latency measurements; display a clear queue-full message before accepting more work. Preserve the existing four-angle limit per meal.
- Persist job metadata/results in a new SQLite table on native and the web persistence layer; keep image blobs in IndexedDB on web. Retain photos durably before treating a queued draft as recoverable. Do not persist base64 in JSON/Zustand snapshots.
- Add `ScanStatusBanner.js` and `ScanInboxScreen.js`, plus navigation parameters for opening a particular job. Keep review edits keyed by job ID so one job cannot inherit another job's form values.
- Make saving a completed scan idempotent using its job ID and an atomic persistence operation. Repeated taps, reopening a result, and restart recovery must not duplicate a meal or water entry.
- Integrate queue cleanup with clear-logs, import, demo reset, and factory reset. Stop affected jobs first so an old completion cannot repopulate data after reset.
- Add completion-notification routing by job ID only after persistence is reliable. The in-app banner remains sufficient when notification permission is declined.

Continuing a scan while navigating inside the foreground app is the proposed first-release scope, to be verified by the acceptance checks. Phone lock, switching to another app, process termination, and browser-tab closure require recovery semantics: preserve the draft and resume/retry interrupted work on return. Expo's scheduled background tasks run when the OS allows, with a minimum 15-minute interval on Android, so they do not provide immediate, guaranteed meal analysis after app closure. A separate server-backed job could continue after the server has received the upload; it would still need an explicit upload-accepted state and recovery/delivery handling. See [Expo BackgroundTask](https://docs.expo.dev/versions/v57.0.0/sdk/background-task/).

**3. Make the image and AI pipeline predictable**

| Finding | Proposed improvement | Priority |
| --- | --- | --- |
| Cancel currently increments a request counter without aborting `fetch`. | Pass a job-owned cancellation signal through photo/label analysis, every Gemini attempt, and preparation checkpoints. Abort must not trigger fallback or a no-food retry. Keep stale-result guards too. | High |
| Each Gemini attempt has its own 25-second timer; fallback/configuration/lenient retries can extend the total wait. | Add a shared overall deadline and explicit total attempt budget. Distinguish timeout, user cancellation, quota, bad input, and service errors. Surface a retry state instead of an indefinite spinner. | High |
| Every non-key HTTP 400 in fast mode disables thinking configuration globally. | Preserve the recent compatibility fallback, but scope learned capability to the model/configuration and avoid treating every malformed request as permanent evidence about thinking support. Separate logical-action throttling from actual network-attempt accounting. | Medium |
| `skipProcessing: true` ignores capture `quality` and may preserve problematic orientation. | Benchmark supported capture sizes and orientation handling on the target phone; normalize once. Keep food and nutrition-label settings separate. | High |
| Food resizing always sets width 896; label resizing always sets width 1600. | Bound the longest edge and avoid upscaling small inputs. Retain label detail; tune image size/quality against readability and actual payload measurements. | Medium |
| Multi-angle gallery preparation runs sequentially and exposes only completed optimized photos. | Stage raw previews immediately, then prepare them with bounded concurrency and per-photo failures. Release base64 after its request and do not retain duplicate full-size buffers. | Medium |
| Meal rows display 42-pixel thumbnails using the saved analysis photo. | Generate small thumbnails once and use them in diary lists and scan banners. Keep a larger review image separately where useful. | Medium |
| Failure paths clear captured images. | Keep recoverable scan drafts and show errors inline with actions. Do not require taking the same photo again after a temporary network failure. | High |

Expo explicitly documents the `skipProcessing` quality/orientation behavior in its [camera reference](https://docs.expo.dev/versions/v57.0.0/sdk/camera/). These optimizations need on-device measurements; there is no evidence yet that upload or model inference is the sole latency bottleneck.

**4. Other concrete improvements found during the review**

| Finding in current source | Proposed action |
| --- | --- |
| `exportAllDataJSON()` serializes the complete profile, including `custom_api_key`, on native and web. Project notes incorrectly say it is excluded. | Sanitize exported profiles and keep credentials out of backups, scan records, and logs. Define import behavior explicitly so restoring a sanitized backup does not unexpectedly erase the current key. |
| Native reminder opt-out is only stored in the module variable `remindersExplicitlyCancelled`. On a fresh process it resets, and granted permission plus zero reminders schedules them again. | Persist the user's reminder preference. Track the four reminder IDs so scheduling/cancelling reminders cannot interfere with future scan notifications. Web currently stores an enabled flag but does not actually schedule recurring reminders; make that UI truthful. |
| `get7DaySummary()` makes three data-read calls for each of seven days, sequentially by day; any `dataRevision` causes a full reload. On native these are SQL queries; on web they read in-memory collections. No timing penalty has been measured yet. | Measure the current path, then use grouped date-range summaries and targeted cache invalidation if justified. Preserve the existing date indexes. |
| Images are persisted before meal writes, with no corresponding cleanup if a write fails. Changing/replacing photos also lacks complete old-file cleanup. | Manage file ownership explicitly, roll back newly created files after failed saves, and delete replaced/orphaned files only after confirming no meal or draft references them. Close IndexedDB connections on every completion/error path. |
| Multi-angle photos appear in review but saving retains only the first `image_uri`. | Persist all photo references if the multi-angle experience is intended to survive saving; otherwise explain that only the cover photo is kept. Draft jobs must keep all inputs needed for retries. |
| The review displays ingredients/tags/tips/score, but its save payload and native meal schema do not preserve much of this analysis metadata. | Decide which fields should remain available after saving, then add a versioned metadata field/migration and consistent native/web backup handling. |
| The latest Gemini schemas omit confidence, while prompts and the review badge still refer to it. | Align the response contract and UI. If a confidence indicator is retained, use a bounded integer percentage and describe it as an AI estimate; do not present an uncalibrated score as verified accuracy. |
| The calorie ring updates React state on every animation frame. Dashboard entrance animations replay after each tab remount. | Profile while a scan runs. Move expensive animation updates away from React state where supported; reduce unnecessary replay and support reduced-motion settings. |
| `OfflineBanner` only listens to browser connectivity events. | Add native connectivity handling for queue pause/resume and distinguish connectivity from an actual API error. |
| Quick activity logging has no synchronous in-flight lock. | Add a short saving state to prevent accidental duplicate workout taps while preserving intentional repeat logging. |
| Initial setup inserts sample meals/workouts into a real diary. | Offer an explicit demo mode and a clean initial diary so sample data does not look like the user's own intake. |
| The theme's opaque tertiary text/card color pair is `#636366` on `#1C1C1E`, with a calculated contrast of approximately 2.84:1. Individual rendered controls still need review. | Brighten small labels/placeholders, retain semantic macro colors, measure actual touch targets, and test large text plus screen-reader status announcements. |
| Package declarations list `@expo/vector-icons` under both dependencies and devDependencies with different versions. Documentation contains stale file paths, schema descriptions, test counts, streaming claims, and sub-second promises. | Align dependency declarations with the installed Expo setup and update documentation from the final implementation. Performance claims should use measured results. |

Media-inclusive backup export, durable chat history, favorite/repeat meals, and a corrected long-term walking summary are useful later additions. They should follow the capture/queue work rather than expand its first release. The current walking summary derives steps/distance from a single assumed pace, even though the walking form supports several paces; retaining the entered walking quantities would make those summaries consistent.

**5. Visual direction and small images**

Keep the warm charcoal, sage, clay, dusty blue, and rose palette. Improve hierarchy, spacing, label contrast, and image placement while keeping calories and logging actions easy to find.

The existing breakfast/lunch/dinner/snack files are each 1024 × 1024, total 1,542,438 bytes (about 1.47 MiB), and are not currently referenced by the active `src` UI. Their `.png` filenames contain JPEG data; use matching extensions on new exports. The inspected breakfast/lunch assets use bright blue circles and white backgrounds. Introduce a coherent set that fits the dark theme; retain original artwork outside the runtime asset path if it is still useful.

Propose three locally bundled images, with a combined target budget of 150 KB (150,000 encoded bytes). This is a design/performance budget, not an Expo restriction or measured compression result. Start with exports around 320–480 pixels for small cards; check the displayed size and device pixel density before finalizing resolution. Select JPEG/WebP according to verified target-platform support, and inspect actual encoded quality/size before accepting them. Avoid bundling full-resolution generation outputs.

| Placement | Image concept | Approximate display size | Treatment |
| --- | --- | --- | --- |
| Dashboard compact “Log your next meal” card, near the meal list | Warm, naturally lit balanced South Asian plate | 80–96 px beside text | Rounded crop, subtle edge shading, one clear scan action |
| Activity empty state or compact walking card | Walking shoes with soft outdoor light | 72–88 px beside text | Muted warm greens, short copy, visible Add Workout action |
| Sage meal-planning introduction/empty state | Fresh ingredients or a simple nourishing bowl | 72–88 px beside text | Same lighting and crop language as the dashboard |

Real captured food photos belong in the processing banner, scan inbox, diary, and review. Decorative assets should remain clearly separate from the user's meal records and be hidden from screen readers. Use restrained motion and avoid repeated large banners or heavy blur that competes with the main numbers.

**6. Delivery order and verification**

The following values are tunable proposals. Validate them on a named reference device/build and record observed results before changing them or presenting them as product guarantees.

| Proposed default | Rationale | How to evaluate it |
| --- | --- | --- |
| One active scan; three pending jobs total | Limit concurrent image memory and request bursts while allowing another capture. | Measure UI responsiveness, peak memory, processing throughput, and queue usability with one to four photos per job. |
| Three decorative images; 150,000 bytes combined | Add warmth to the interface with a small asset payload. | Inspect crops at target display density, record encoded file sizes, and compare screen-load behavior. Adjust count/budget if quality needs it. |
| Preview loaded within 300 ms of capture URI availability | Initial responsiveness target independent of network inference time. | Measure repeated captures and record sample count, median, and p95 by device/build, separately from shutter-to-URI time. Do not use one fast capture as proof. |

1. **Preview repair:** update all removed style usages, add resilient preview rendering, fix the test harness's blind spot, and verify actual native capture/label/barcode layouts. Include backup sanitization and persisted reminder opt-out as small independent reliability fixes.
2. **Scans while navigating:** introduce shared jobs and the runner, durable draft photos/results, inbox/banner, navigation behavior, explicit cancellation, original-date handling, and safe save/reset behavior. Cover food photos and labels first.
3. **Measured optimization:** bound retry deadlines, improve preparation/thumbnail memory use, optimize weekly summaries, and finish file lifecycle handling. Extend shared jobs to text parsing where it improves the workflow.
4. **Visual polish:** create/compress the three coordinated images; refine dashboard/activity/Sage states, contrast, spacing, motion, and small-screen behavior.
5. **Release checks:** update documentation and run the existing suite plus focused new regressions, production bundle checks, and native device verification.

Existing verification on 19 October: `npm test` passed all **54 tests across six test files**, including a fresh run for this revision. An AST inspection of the installed native StyleSheet confirmed the missing property; a separate source search confirmed all ten application references. The camera regression test currently checks that an Image node with a URI exists, but does not assert nonzero layout or actual image loading; the generic UI adapters also discard style/image behavior. These tests can miss the native preview defect.

Read-only checks to reproduce the main repository evidence from the project root in PowerShell:

```powershell
git log -2 --format='%h %s'
rg -n 'StyleSheet\.absoluteFillObject' src
(rg -o 'StyleSheet\.absoluteFillObject' src | Measure-Object -Line).Lines
node -p "require('react-native/package.json').version"
Get-Content node_modules/react-native/Libraries/StyleSheet/StyleSheetExports.js
rg -n 'StyleSheet.absoluteFill' node_modules/react-native-web/dist/exports/StyleSheet/index.js
rg --files tests -g '*.test.js'
npm test
```

Inspect the native export object in full: a text match for the supported name alone does not establish the absence of another export. The earlier AST inspection enumerated its exported property names as `hairlineWidth`, `absoluteFill`, `compose`, `flatten`, `setStyleAttributePreprocessor`, and `create`. Native React Native is not intended to be loaded with a plain Node `require('react-native')` to establish runtime UI behavior. If checking on-device, inspect `StyleSheet.absoluteFillObject` in the actual app's development runtime and record the installed app/build version too.

Add behavioral coverage for preview sizing/load failure, leaving and reopening a scan, completing jobs out of order, cancellation during resize/fetch/retry, cancelling then immediately retaking, date changes/midnight, duplicate save taps, failed persistence, reset/import during analysis, restart recovery, queue limits, notification opt-out after restart, and backup credential exclusion.

On a reference Android phone, deliberately delay Gemini for 15–20 seconds and verify that the captured photo remains visible while water, workouts, manual meals, dates, and Sage remain usable. Test all four photo sources: in-app camera, system camera, gallery, and multi-angle tray. Repeat relevant capture/layout checks on iOS and web. Check lock/resume separately from navigating inside the app.

Capture the preview failure before the style fix and repeat with the same photo/device/build settings after the fix. Record image load/error events and nonzero preview dimensions. Only then promote the leading explanation to a device-confirmed cause. Production bundle/export success is a separate build check and does not substitute for this native rendering check. No physical-device reproduction, live API timing, new asset-compression result, or post-change build check has been performed for this proposal.

The proposed release is complete when a scan never requires the user to remain on its processing screen, its result survives navigation/reopening, its photo appears before the AI result, explicit cancellation stops unnecessary work, and only confirmed meals update diary totals.
