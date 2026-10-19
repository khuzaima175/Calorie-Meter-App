# Implementation and verification — 19 October 2026

The approved scan/navigation/visual improvements are implemented in the working tree. No commit or release has been created. This record distinguishes automated checks, browser checks, live API samples, and checks that still need a phone.

## Implemented behavior

- Captured photos have an explicitly sized preview with load/error/retry handling, before AI completes. All application uses of the removed `absoluteFillObject` have been replaced. Camera/label capture has readiness and mount-error handling; orientation processing remains enabled.
- A screen-independent runner owns photo, label, barcode, and text jobs. One analysis runs at a time; three preparing/queued/analyzing jobs are allowed. Ready/failed drafts remain available separately. Users can navigate, log water/workouts/manual meals, and use Sage while scans run.
- The Scans inbox and persistent banner retain photos, results, edits, original diary date, retries, text fallback, and explicit cancellation/discard. Completion never logs food automatically. Restart restores interrupted scans for explicit retry, without blindly sending another paid request.
- Native SQLite migration 3 and web persistence store job descriptors and ready results. Scan save atomically inserts food/water, records a completion receipt, and removes the draft. Repeated saves do not duplicate diary entries. Reset/import invalidates in-flight jobs before replacing data.
- Food images use an 896px longest edge / JPEG .62; labels use 1600px / .82. Small images are not enlarged. Thumbnails use a 160px longest edge. Base64 stays request-local. Text fallback bypasses image decoding even when a retained photo cannot be read.
- Gemini requests share a 45-second overall deadline and three-attempt budget, with 25-second per-attempt limits. Abort propagates through fetch/retries. Logical actions and actual network attempts are throttled separately. Successful thinking-configuration compatibility is remembered per model. Recognition instructions require visible evidence and forbid inventing example foods.
- Backups exclude API keys and scan drafts; restore retains the currently configured key. All saved scan photos and analysis metadata survive diary save. Media cleanup checks both diary and draft ownership; failed deletions are queued for retry.
- Native reminder opt-out persists across restart. Cancelling reminders does not cancel scan notifications. Web recurring reminders are explicitly unavailable. Connectivity monitoring pauses queued jobs and refreshes on native resume.
- Weekly summaries use three grouped native queries; data mutation invalidates the summary separately from date navigation. Quick workout logging has a synchronous double-tap guard. The calorie ring no longer causes a React state update each animation frame; key animations support reduced motion.
- Fresh diaries start empty, with explicit demo loading. Three coordinated 384px JPEGs total **99,739 bytes**. Their final prompts and provenance are in `assets/editorial/README.md`. Small-label contrast was brightened, and icon imports now include only Ionicons.

## Automated verification

- `npm test`: **86 passed, 0 failed**, across **10 test files**. Native hardware/UI APIs are mocked; business logic runs from production modules.
- Coverage includes cancellation while staging/fetching, late replies, queue capacity and serial analysis, screen-independent completion, restart recovery, retained review edits, original dates, duplicate save suppression, transactional rollback, failed deletion/save recovery, shared photo ownership, credential exclusion, clean initial diaries, grouped weekly summaries, stale connectivity reads, and cold/warm scan-notification routing.
- SQLite transaction tests run real in-memory SQLite through Node's SQLite adapter. Browser persistence tests use isolated synthetic storage. Neither constitutes a physical phone test.
- All **55 source JavaScript modules** parsed successfully through Babel.
- `expo install --check`: dependencies are up to date for the installed Expo setup. Animation packages are pinned to Expo's recommended Reanimated **4.5.1** / Worklets **0.10.1** pair to prevent an incompatible broad upgrade.
- Final production exports passed for **Web, Android, and iOS**. Android/iOS exports produce Hermes bundles; they are not installed APK/IPA builds. A cache-cleared verification export uses a placeholder API key. Normal live-preview artifacts are separate and ignored by Git.
- A cold-cache export caught a truncated installed Hermes parser file after interrupted package downloads. That nested package was restored from the official npm package, then a fresh `--clear --max-workers 2` export passed on all three platforms. Verification web/native bundles were checked to contain the placeholder and not the configured API key.
- `git diff --check` passed. Package declarations and lockfile agree.

## Live recognition samples

Direct calls through the production `geminiService` used the existing environment key and only the newly generated, nonsensitive editorial images. No credentials or base64 were printed.

| Input | Observed result | Service elapsed time | HTTP attempts |
| --- | --- | --- | --- |
| `meal.jpg` | Chicken Tikka with Daal, Roti, and Kachumber Salad | 2,615 ms | Not instrumented in this first sample |
| `ingredients.jpg` | Chickpea and Vegetable Salad Bowl | 3,261 ms | 1 |
| `walk.jpg` | Rejected with `NO_FOOD` | 3,526 ms | 2, including the no-food recheck |

These are individual samples with small 384px images, not a latency distribution, accuracy benchmark, or phone capture-to-result measurement. They exclude camera capture and image preparation. No sub-second guarantee is made.

## Preview isolation

The normal app is served at `http://127.0.0.1:8888` from `dist-preview`, with live recognition and no test interception. A deliberately delayed fixed daal/roti fixture was initially shown in the sidebar without a visible label. A later labelled fixture preview on port 8890 also replaced the user's shared sidebar, despite being opened for background verification. Both test servers were stopped after the user reported repeated results. The normal live preview was restored.

The temporary fixed-response server script was removed entirely. Keep deterministic mocks in automated tests; do not put a fixed-response preview into the shared sidebar again. Test-origin samples were not migrated into the live-origin diary.

Browser inspection confirmed the actual image rendered while the delayed request was still analyzing, navigation returned to a dashboard with the scan banner, and review exposed its retained photo and draft controls. The saved `scan-processing.png` screenshot is explicitly labelled as a test. The restored `live-preview.png` screenshot has no test banner. Further manual browser interaction was stopped to avoid interfering with the user's live session; the complete cross-screen workflow matrix still needs uninterrupted device/browser execution.

## Dependency audit

Compatible Expo patches were installed and normal `npm audit fix --ignore-scripts` applied. The initial audit reported 31 affected dependency entries (including 1 critical); the final fix report lists **27 entries: 18 high, 9 moderate, 0 critical**. Entries include transitive parents and are not 27 independent flaws.

- Patched `shell-quote` to **1.12.0**, `http-cache-semantics` to **4.3.0**, and `source-map-js` to **1.2.2**.
- Remaining root advisories concern `braces` 3.0.3, `node-forge` 1.4.0, and older `uuid` copies, primarily through Metro/Expo CLI, code-signing tooling, Xcode parsing, and ngrok. `npm audit` suggests breaking Expo/Expo Sharing downgrades, which were not applied. Do not use `npm audit fix --force` as a routine fix.
- Upstream dependency remediation remains outstanding. A successful export does not establish that the dependency audit is clean.

## Checks requiring a reference phone

No Android SDK/ADB device was available in this environment, and iOS hardware/simulator execution was not performed. Before shipping, verify:

1. Camera, system camera, gallery, and multi-angle capture on Android; corresponding iOS paths. Check nonzero preview layout, portrait/landscape orientation, permission denial/retry, hardware release, and retake.
2. A delayed scan while logging water/workouts/manual meals, changing dates, and chatting. Verify image visibility during preparation and inference, and opening the correct completed result.
3. Lock/resume, app switch, process kill/relaunch, offline recovery, notification delivery/taps, large text, screen reader announcements, and reduced-motion settings.
4. Repeated capture-to-preview timing (median/p95), memory during four-image jobs, payload sizes, and full capture-to-result latency on a named device/build. The proposed 300ms preview target remains unmeasured on-device.

Foreground navigation is supported. Continued execution after lock, suspension, force-close, or browser-tab closure is not guaranteed. A server-backed job system would be a separate feature.
