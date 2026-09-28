# CalorieSnap Pro — Issues, Bug Tracker & Feature Roadmap

A comprehensive record of all engineering issues, bugs encountered during development, root cause analyses, exact solutions applied, and upcoming feature roadmap items.

---

## 🐞 Encountered Issues & Engineering Solutions

### 1. Temporary Cache Image Purge Data Loss
- **Severity**: 🔴 Critical
- **Symptoms**: After several days, meal photo cards displayed broken images or 404 errors on physical mobile devices.
- **Root Cause**: `expo-camera` and `expo-image-picker` save photos in the OS temporary cache directory. Android and iOS periodically purge cache folders.
- **Solution**: Implemented [`persistImageAsync`](file:///g:/Important%20Projects/calorie%20meter/src/services/imageService.js#L140-L175) in `imageService.js`. When a meal is logged, the temporary image is copied to permanent `FileSystem.documentDirectory + 'meals/'` before saving the path to SQLite. Added automated deletion cleanup via `deletePersistedImageAsync` when a meal is removed.

---

### 2. Whole-App White-Screen Crash on Unhandled Render Glitches
- **Severity**: 🔴 Critical
- **Symptoms**: Malformed responses, rendering issues, or missing props caused the entire app to crash to a white screen.
- **Root Cause**: Absence of a top-level React Error Boundary.
- **Solution**: Built [`ErrorBoundary.js`](file:///g:/Important%20Projects/calorie%20meter/src/components/ErrorBoundary.js) with clean error diagnostics and an interactive **"Reload Screen"** button, wrapping the root application tree in `App.js`.

---

### 3. Artificial Token Delay in AI Nutritionist Chat
- **Severity**: 🟠 High
- **Symptoms**: Gemini AI responses took 8–14 seconds to display in the chat UI despite the API returning in ~900ms.
- **Root Cause**: An artificial `setTimeout` token-by-token typing loop inside `useAIStore.js` was sequentially iterating through character chunks with 25ms delays.
- **Solution**: Removed the synthetic delay loop, rendering Gemini 3.5 Flash-Lite's ~900ms response immediately upon arrival.

---

### 4. Android Camera SurfaceView Black Screen Behind Opaque Containers
- **Severity**: 🔴 Critical
- **Symptoms**: Camera captured photos correctly, but the live viewfinder preview was pitch black on Android devices.
- **Root Cause**: On Android, `SurfaceView` renders in a native hardware overlay layer behind the React Native View hierarchy. Parent containers with opaque background colors (`backgroundColor: '#121214'`) filled the viewport hole and obscured the camera feed.
- **Solution**: Converted all parent wrappers in `LogMealScreen.js`, `CameraScanner.js`, and `TabNavigator.js` to `backgroundColor: 'transparent'`, allowing the native camera surface to show through cleanly.

---

### 5. Double-Tap Save Duplicate Meal Insertion
- **Severity**: 🔴 Critical
- **Symptoms**: Rapidly pressing the "Log to Daily Intake" or "Save Changes" button created duplicate meal entries in the database.
- **Root Cause**: Handlers executed asynchronously without state locking during the database insertion round-trip.
- **Solution**: Added `isSaving` state locks with strict `try / catch / finally` blocks on `handleSaveManual`, `handleSaveAnalysisResult`, `QuickAddModal.js`, and `AddExerciseModal.js`. Action buttons are immediately disabled and display a loading spinner upon first press.

---

### 6. Barcode Scanner Fast-Scan Race Condition
- **Severity**: 🟠 High
- **Symptoms**: Scanning barcodes rapidly or typing manual codes could cause older, slower API responses to overwrite newer scan results.
- **Root Cause**: Asynchronous `lookupBarcode` promises resolving out-of-order.
- **Solution**: Implemented a monotonic request ID counter (`barcodeReqIdRef`) in `handleScanBarcode`. If an API response resolves with an ID older than the latest dispatched scan, it is discarded immediately.

---

### 7. Gemini Markdown JSON Syntax Parse Failures
- **Severity**: 🟠 High
- **Symptoms**: Occasional `JSON.parse` failures when Gemini wrapped JSON in markdown fences (` ```json `) or conversational prefixes.
- **Root Cause**: Relying solely on prompt instructions for JSON formatting without API-level schema enforcement.
- **Solution**: Enabled strict structured outputs with `responseMimeType: 'application/json'` and `responseSchema` configurations (`FOOD_ANALYSIS_SCHEMA`, `NUTRITION_LABEL_SCHEMA`, `MEAL_PLAN_SCHEMA`) across all Gemini API calls, complemented by `cleanJsonText` sanitization.

---

### 8. Unbounded Chat History Context & Token Limit Overflow
- **Severity**: 🔴 Critical
- **Symptoms**: Extended chat sessions with the AI Nutritionist risked exceeding token ceilings and triggering HTTP 400 `INVALID_ARGUMENT` errors.
- **Root Cause**: Unbounded appending of chat history without token budgeting.
- **Solution**: Implemented `estimateTokens` (~4 chars/token) and `sanitizeChatHistory` with a 7,500-token ceiling that counts backwards from the newest message, drops complete conversation pairs, and enforces strict `[user -> model]` alternation.

---

### 9. Web Browser Image Storage Quota Overflow
- **Severity**: 🟠 High
- **Symptoms**: Saving large base64 image strings into browser `localStorage` quickly exceeded the 5MB browser quota limit.
- **Root Cause**: `localStorage` was being used to store both relational JSON tables and heavy image binaries.
- **Solution**: Integrated browser **IndexedDB** (`CalorieSnapImagesDB`) for web image binaries with a 10MB size guard and quota exhaustion fallback, keeping `localStorage` lightweight for JSON records.

---

### 10. Manual Entry Boundary & Validation Gaps
- **Severity**: 🟠 High
- **Symptoms**: Negative or unrealistic calorie entries (e.g. `-500` or `999999`) could corrupt daily totals and streak logic.
- **Root Cause**: Lack of boundary validation before committing to SQLite.
- **Solution**: Enforced strict validation ranges ($1 \le \text{calories} \le 10,000$, $0 \le \text{macros} \le 1,000$, $1 \le \text{workout duration} \le 720\text{ mins}$) with clear feedback alerts.

---

### 11. Future Date Logging Streak Corruption
- **Severity**: 🟡 Medium
- **Symptoms**: Users could navigate to tomorrow and log entries, breaking daily streak tracking.
- **Root Cause**: Unrestricted forward day navigation.
- **Solution**: Disabled and dimmed the forward date navigation button in `DaySelector.js` whenever `isToday(currentDate)` is true.

---

### 12. Backup & Restore Schema Forward Incompatibility
- **Severity**: 🟡 Medium
- **Symptoms**: Restoring an older v1.0 backup into a newer schema version caused missing column errors.
- **Root Cause**: Raw bulk insertion without schema normalization.
- **Solution**: Added `schema_version: 2` stamping to exported JSON and built automatic forward migration logic into `importAllDataJSON` to populate missing fields (`custom_api_key`, `sodium`, `sugar`, `fiber`) with safe defaults.

---

## 🚀 Feature Status & Roadmap

### ✅ Completed Features (Production Ready)

| Feature | Description | Status |
|---|---|---|
| **AI Food Vision** | Multimodal plate analysis with Pakistani & international cuisine recognition | ✅ Active |
| **Nutrition Label OCR** | Direct table extraction from Nutrition Facts packaged goods | ✅ Active |
| **Barcode Scanner** | Instant barcode scanning via OpenFoodFacts with kJ/kcal conversion | ✅ Active |
| **Natural Language Parser** | Text-based meal parsing in English and Roman Urdu | ✅ Active |
| **Hydration Tracker** | Interactive water intake logging with +250ml / +500ml quick adds & undo | ✅ Active |
| **Workout & MET Engine** | Exercise logger with weight-based MET calorie burn calculation | ✅ Active |
| **Mifflin-St Jeor Engine** | Automated BMR/TDEE calculation and macro target distribution | ✅ Active |
| **7-Day Nutrition Trends** | Weekly calorie intake vs target goal bar chart with deficit/surplus stats | ✅ Active |
| **Sage AI Coach** | Nutritionist chat, daily diet review generator, and custom meal planner | ✅ Active |
| **Permanent Image Cache** | Native disk persistence + Web IndexedDB storage | ✅ Active |
| **Data Backup / Restore** | Full JSON export and schema-validated backup restore | ✅ Active |
| **Factory Reset** | Complete data wipe with double-confirmation modal | ✅ Active |
| **Local Notifications** | Configurable daily reminders for breakfast, lunch, hydration, and evening review | ✅ Active |
| **Accessibility (A11y)** | WCAG AA labels, roles, hints, and states on all interactive elements & buttons | ✅ Active |
| **Offline Mode Banner** | Dynamic banner indicating local SQLite persistence | ✅ Active |
| **Unit Test Suite** | 10 automated unit tests (`npm test`) covering math, formulas & sanitizers | ✅ Active |

---

### ⏳ Upcoming Feature Roadmap

- [ ] **Biometric Lock**: Optional Face ID / Fingerprint app lock via `expo-local-authentication`.
- [ ] **Micro-Nutrient Breakdown**: Extended vitamins and minerals tracking (Iron, Calcium, Vitamin D, Potassium).
- [ ] **Custom Recipe Builder**: Multi-ingredient meal creation with composite macro calculation.
- [ ] **HealthKit / Google Health Connect Sync**: Direct export and sync with Apple Health and Google Health Connect.
- [ ] **Incremental TypeScript Migration**: Gradual type-safety adoption starting with `src/services/` and `src/stores/`.
