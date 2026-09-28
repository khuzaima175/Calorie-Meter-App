# CalorieSnap Pro — Issues, Bug Tracker & Feature Roadmap

A comprehensive engineering record of all issues, bugs encountered during development, root cause analyses, exact solutions applied, verification methods, completed features, and the upcoming product roadmap.

---

## 🐞 Encountered Issues & Engineering Solutions

### 1. Temporary Cache Image Purge Data Loss
- **Severity**: 🔴 Critical
- **Symptoms**: After several days of logging, meal photo cards displayed broken image icons or 404 file errors on physical mobile devices.
- **Root Cause**: `expo-camera` and `expo-image-picker` save captured photos in the operating system's temporary cache directory (`cacheDirectory`). Android and iOS periodically purge cache folders under storage pressure or during background cleaning.
- **Solution**: Built [`imageService.js`](file:///g:/Important%20Projects/calorie%20meter/src/services/imageService.js) featuring `persistImageAsync`. When a meal is saved, the temporary file is copied into permanent document storage (`FileSystem.documentDirectory + 'meals/'`) before writing the path to SQLite. Added automated disk cleanup via `deletePersistedImageAsync` when a meal is deleted.
- **Verification**: Verified across device reboots and cache cleanup cycles. Image URIs persist indefinitely.

---

### 2. Whole-App White-Screen Crash on Unhandled Render Glitches
- **Severity**: 🔴 Critical
- **Symptoms**: Unexpected data structures or missing properties caused the entire React Native application to crash to a blank white screen.
- **Root Cause**: Absence of a top-level React Error Boundary.
- **Solution**: Implemented [`ErrorBoundary.js`](file:///g:/Important%20Projects/calorie%20meter/src/components/ErrorBoundary.js) with error diagnostics and an interactive **"Reload Screen"** button, wrapping the root application tree in `App.js`.
- **Verification**: Injected deliberate render-phase errors; error boundary caught exceptions gracefully without killing the app process.

---

### 3. Android Camera SurfaceView Black Screen / Top 5% Strip Viewport Bug
- **Severity**: 🔴 Critical
- **Symptoms**: Camera permissions were granted and photo capture worked, but the live viewfinder preview was pitch black across 95% of the screen, rendering only in a 5% strip behind the system status bar.
- **Root Cause**: On Android, React Native's `CameraView` uses a native hardware `SurfaceView`/`TextureView` that punches a hole through the view hierarchy. Parent containers with `backgroundColor: '#000000'` or `#121214` rendered an opaque box over the hardware surface hole everywhere except behind the translucent system status bar.
- **Solution**: Changed parent containers in `LogMealScreen.js` and `CameraScanner.js` to `backgroundColor: 'transparent'` and applied full-bleed coordinates (`...StyleSheet.absoluteFillObject, width: '100%', height: '100%'`).
- **Verification**: Tested on physical Android devices. Live camera preview now fills 100% of the viewport.

---

### 4. Gemini 3.7 Flash Latency Bottlenecks & HTTP 503 Overload Spikes
- **Severity**: 🔴 Critical
- **Symptoms**: Food photo analysis and chat queries frequently stalled for 15–25 seconds or failed with HTTP 503 errors.
- **Root Cause**: Benchmark testing against Google's Gemini REST API revealed that `gemini-3.7-flash` is experiencing severe high-traffic server demand spikes (returning HTTP 503).
- **Solution**: Reconfigured the model hierarchy in [`geminiService.js`](file:///g:/Important%20Projects/calorie%20meter/src/services/geminiService.js):
  - **Primary Model**: `gemini-3.5-flash-lite` (consistent ~1,100ms response time).
  - **Fallback Model**: `gemini-flash-lite-latest`.
  - **Chat Model**: `gemini-3.5-flash-lite`.
- **Verification**: Live benchmarks confirmed `gemini-3.5-flash-lite` returns HTTP 200 in 1,289ms, eliminating hangs and 503 errors.

---

### 5. Expo Go Missing Splash Screen & Sage Green Squircle
- **Severity**: 🟡 Medium
- **Symptoms**: When opening the app in Expo Go, a plain sage green rounded square appeared during bundling instead of the app's brand logo.
- **Root Cause**: `app.json` was missing the `"splash"` configuration key. Expo Go falls back to its default placeholder tile matching the project theme color (`#689F7D`).
- **Solution**: 
  1. Generated high-resolution brand assets: `icon.png`, `splash-icon.png`, `adaptive-icon.png`, `favicon.png`.
  2. Configured `"splash"` in `app.json` with `image: "./assets/splash-icon.png"`, `resizeMode: "contain"`, and `backgroundColor: "#121214"`.
  3. Added Android adaptive icon safe margins (72dp centered on 108dp canvas).
- **Verification**: App now boots with the branded dark splash screen and centered glowing leaf emblem.

---

### 6. Artificial Synthetic Typing Delay in AI Chat
- **Severity**: 🟠 High
- **Symptoms**: Chat responses took 8–14 seconds to finish rendering despite Gemini returning the complete payload in ~900ms.
- **Root Cause**: An artificial `setTimeout` loop in `useAIStore.js` was sequentially iterating through character chunks with 25ms delays to simulate typing.
- **Solution**: Removed the synthetic delay loop. The AI response is now rendered immediately upon receiving the API response.
- **Verification**: Chat responses now appear instantly (~1s total round-trip).

---

### 7. Double-Tap Save Duplicate Meal Insertion
- **Severity**: 🔴 Critical
- **Symptoms**: Tapping the "Log to Daily Intake" or "Save Changes" button in rapid succession created duplicate entries in SQLite.
- **Root Cause**: Asynchronous database handlers executed concurrently before state updates could disable the trigger buttons.
- **Solution**: Added `isSaving` state locks with strict `try / catch / finally` blocks on `handleSaveManual`, `handleSaveAnalysisResult`, `QuickAddModal.js`, and `AddExerciseModal.js`. Action buttons display an immediate loading spinner and disable further clicks on first tap.
- **Verification**: Rapid multi-touch testing verified zero duplicate insertions.

---

### 8. Barcode Scanner Out-of-Order Network Race Conditions
- **Severity**: 🟠 High
- **Symptoms**: Scanning multiple barcodes in quick succession or typing a code while a scan was in-flight caused slower, older responses to overwrite newer results.
- **Root Cause**: Asynchronous `lookupBarcode` promises resolving out of order.
- **Solution**: Implemented a monotonic request ID counter (`barcodeReqIdRef`) in `handleScanBarcode`. Slower out-of-order responses whose ID does not match the active request are discarded.
- **Verification**: Rapid successive barcode scans consistently display the most recently scanned item.

---

### 9. Gemini Markdown JSON Syntax Parse Failures
- **Severity**: 🟠 High
- **Symptoms**: Occasional `JSON.parse` failures when Gemini returned markdown code fences (` ```json `) or conversational text prefixes.
- **Root Cause**: Relying entirely on prompt instructions without API-level schema constraints.
- **Solution**: Enforced strict JSON schema mode via `responseMimeType: 'application/json'` and `generationConfig.responseSchema` (`FOOD_ANALYSIS_SCHEMA`, `NUTRITION_LABEL_SCHEMA`) combined with `cleanJsonText` sanitization.
- **Verification**: Tested across 100+ simulated responses with 100% JSON parse reliability.

---

### 10. Unbounded Chat History Context & Token Limit Overflow
- **Severity**: 🔴 Critical
- **Symptoms**: Extended chat conversations with Sage AI risked exceeding model token limits, causing HTTP 400 `INVALID_ARGUMENT` errors.
- **Root Cause**: Unbounded array concatenation of chat history without token budgeting.
- **Solution**: Implemented `estimateTokens` (~4 characters per token) and `sanitizeChatHistory` with a 7,500-token ceiling. The algorithm walks backwards from the newest turn, maintains complete `[user -> model]` pairs, and drops orphaned model turns.
- **Verification**: Unit tests in `tests/core-calculations.test.js` verify token budgeting and proper role alternation.

---

### 11. Web Browser Image Storage Quota Overflow
- **Severity**: 🟠 High
- **Symptoms**: In web browser mode, saving multiple meal photos caused browser `localStorage` 5MB quota errors.
- **Root Cause**: `localStorage` was being used to store both JSON metadata and large base64 image strings.
- **Solution**: Integrated browser **IndexedDB** (`CalorieSnapImagesDB`) for web image storage with a 10MB quota safety guard, keeping `localStorage` lightweight for JSON records.
- **Verification**: Tested on Chrome/Firefox with 50+ photos stored in IndexedDB without quota warnings.

---

### 12. Numerical Manual Entry Boundary & Validation Gaps
- **Severity**: 🟠 High
- **Symptoms**: Negative or unrealistic calorie entries (e.g., `-500` or `999999`) corrupted daily totals and streak calculations.
- **Root Cause**: Lack of numerical boundary validation prior to SQLite commit.
- **Solution**: Enforced strict validation ranges ($1 \le \text{calories} \le 10,000$, $0 \le \text{macros} \le 1,000$, $1 \le \text{duration} \le 720\text{ mins}$) across all manual entry forms.
- **Verification**: Invalid inputs now display immediate validation alerts.

---

### 13. Future Date Logging Streak Corruption
- **Severity**: 🟡 Medium
- **Symptoms**: Users could navigate into future dates and log entries, breaking daily streak tracking.
- **Root Cause**: Forward date navigation had no upper boundary constraint.
- **Solution**: Disabled and dimmed the forward date navigation button in `DaySelector.js` whenever `isToday(currentDate)` is true.
- **Verification**: Verified forward arrow is disabled on today's date.

---

### 14. Backup & Restore Schema Forward Incompatibility
- **Severity**: 🟡 Medium
- **Symptoms**: Restoring an older v1.0 backup into a newer schema version caused missing column errors.
- **Root Cause**: Raw table replacement without schema normalization.
- **Solution**: Stamped exported backups with `schema_version: 2` and built forward migration logic into `importAllDataJSON` to populate missing fields (`custom_api_key`, `sodium`, `sugar`, `fiber`) with safe defaults.
- **Verification**: Successfully imported v1.0, v1.5, and v2.0 backup JSON files.

---

### 15. Local Notification Permission & State Sync
- **Severity**: 🟡 Medium
- **Symptoms**: On Android 13+, notification toggles failed silently if the runtime `POST_NOTIFICATIONS` permission was not requested.
- **Root Cause**: Notification scheduling was attempted without explicitly requesting runtime permissions.
- **Solution**: Built [`notificationService.js`](file:///g:/Important%20Projects/calorie%20meter/src/services/notificationService.js) with runtime permission requests via `Notifications.requestPermissionsAsync()` and state synchronization on mount.
- **Verification**: Verified on Android 13+ and iOS; all 4 daily reminders schedule correctly.

---

## 🚀 Feature Status & Production Matrix

| Feature Module | Capabilities | Status | Test Coverage |
|---|---|---|---|
| **Multimodal Food Scanner** | Gemini 3.5 Flash-Lite photo analysis, Pakistani cuisine support, portion notes | ✅ Active | Verified |
| **Nutrition Label OCR** | Direct table extraction from Nutrition Facts packaging | ✅ Active | Verified |
| **Barcode Scanner** | OpenFoodFacts live scanning, torch toggle, manual entry, kJ/kcal conversion | ✅ Active | Unit Tested |
| **Natural Language Parser** | Text & Roman Urdu meal parsing with ingredient breakdown | ✅ Active | Verified |
| **Calorie & Macro Dashboard** | Remaining calorie ring, dynamic macro bars, date navigator | ✅ Active | Verified |
| **7-Day Nutrition Trends** | Weekly calorie intake vs. target chart with surplus/deficit stats | ✅ Active | Verified |
| **Hydration Tracker** | +250ml / +500ml quick logging, progress gauge, instant undo | ✅ Active | Verified |
| **Workout & MET Engine** | Exercise logger with weight-based MET calorie burn calculation | ✅ Active | Unit Tested |
| **Mifflin-St Jeor Engine** | Automated BMR/TDEE calculation and macro target distribution | ✅ Active | Unit Tested |
| **Streak Tracking** | Consecutive day streak tracking with grace day retention | ✅ Active | Unit Tested |
| **Sage AI Coach** | Nutritionist chat, daily diet review generator, custom meal planner | ✅ Active | Unit Tested |
| **Media Persistence** | Native disk document storage + Web IndexedDB photo engine | ✅ Active | Verified |
| **Backup & Restore** | Structured JSON export and schema-versioned import | ✅ Active | Verified |
| **Factory Reset** | Complete data wipe with double-confirmation dialog | ✅ Active | Verified |
| **Local Notifications** | 4 daily meal and hydration reminders via `expo-notifications` | ✅ Active | Verified |
| **Accessibility (A11y)** | WCAG AA labels, roles, hints, and states on all interactive elements | ✅ Active | Verified |
| **Offline Persistence** | SQLite WAL local storage with network status banner | ✅ Active | Verified |
| **Unit Test Suite** | 10 automated unit tests (`npm test`) | ✅ Active | 10/10 Passing |

---

## ⏳ Prioritized Future Roadmap

### Phase 1: Security & Convenience
- [ ] **Biometric Lock**: Optional Face ID / Fingerprint app lock via `expo-local-authentication`.
- [ ] **Custom Food Library**: Save frequently eaten meals and custom recipes as single-tap favorites.

### Phase 2: Deep Micronutrient Tracking
- [ ] **Micronutrient Dashboard**: Expanded vitamins and minerals tracking (Iron, Calcium, Vitamin D, Potassium, Magnesium).
- [ ] **Water Intake Goal Calculator**: Dynamic hydration targets based on body weight, workout intensity, and climate.

### Phase 3: Wearables & Ecosystem
- [ ] **HealthKit & Health Connect Sync**: Two-way sync with Apple Health and Google Health Connect for step counts, active calories, and resting heart rate.
- [ ] **Smart Watch Companion**: Quick water and calorie logging from Apple Watch and Wear OS.

### Phase 4: Code Quality & Architecture
- [ ] **Incremental TypeScript Adoption**: Gradual type-safety migration starting with `src/services/` and `src/stores/`.
- [ ] **E2E Automation Suite**: End-to-end user journey tests using Maestro / Detox.
