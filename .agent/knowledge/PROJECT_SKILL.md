# Project Skill — CalorieSnap Pro (Master Agent Entry Point)

> **Last Reviewed:** 2026-10-17 | **Git Revision:** `2f87a3e` (`main`) | **Test Suite:** 54/54 Passing (`npm test`)
> **Purpose:** Self-sufficient architectural, UI, state, and service reference for AI coding agents. Read this file first; consult the 5 companion files in `.agent/knowledge/` only when deeper detail is needed.

---

## 1. System Identity & Repository Boundary

- **CalorieSnap Pro** is an offline-first, AI-powered nutrition, hydration, and exercise tracker built with **Expo SDK 57 (`~57.0.25`)**, **React Native `0.86.3`**, **React `19.2.3`**, and **Zustand `^5.0.0`** targeting **Android, iOS, and Web**.
- **CRITICAL REPO BOUNDARY**: The active production app lives entirely in `src/`, `tests/`, `index.js`, `app.json`, and `package.json`. Ignore root Python files (`main.py`, `database.py`, `ai_manager.py`, `ui/`), which belong to an inactive legacy desktop prototype.
- **Verification Command**: `npm test` (runs `node --test tests/*.test.js` — 54 passing tests across 6 test suites using [`tests/load-production.cjs`](file:///g:/calorie%20meter/tests/load-production.cjs) to execute real JSX/ESM production code in Node VM).

---

## 2. Complete Architecture & Data Flow Map

```text
[index.js] -> [src/App.js: SafeAreaProvider -> ErrorBoundary -> AppBootstrapper]
   ├── Boot Sequence: initDatabase() -> loadProfile() -> refreshData(today) -> ensureRemindersOnFirstLaunch()
   ├── Web Shell: maxWidth 460px centered container (#121214) + <OfflineBanner />
   └── [src/navigation/TabNavigator.js] (State-switched activeRoute; unmounts inactive screens)
         ├── 'Dashboard' -> DashboardScreen.js (DaySelector, CalorieRing, MacroBar, WaterTracker, WeeklyTrendsCard, MealSection x4, QuickAddModal)
         ├── 'Activity'  -> ActivityScreen.js  (DaySelector, StatCard x2, Quick Walk Card, ExerciseCard list, AddExerciseModal)
         ├── 'LogMeal'   -> LogMealScreen.js   (5 modes: Photo | Label | Barcode | Text | Manual -> FoodAnalysisResult)
         ├── 'Assistant' -> AssistantScreen.js (2 tabs: Streaming Chat [AIChatBubble] + Daily Review | Meal Planner [MealPlanCard])
         └── 'Settings'  -> SettingsScreen.js  (Gemini API Key, Profile/BMR Calculator, Macro Goals, Reminders & Test, JSON Backup/Reset)
```

---

## 3. Zustand Stores Quick-Reference (`src/stores/`)

| Store File | State Properties | Actions & Key Contracts |
| :--- | :--- | :--- |
| [`useNutritionStore.js`](file:///g:/calorie%20meter/src/stores/useNutritionStore.js) | `selectedDate` (`YYYY-MM-DD`), `meals: []`, `exercises: []`, `waterEntries: []`, `isLoading`, `error`, `dataRevision` (int), `dailyTotals: { calories, protein, carbs, fat, fiber, water, caloriesBurned, activeMinutes, netCalories }` | `setSelectedDate(date)` (rejects future date), `refreshData(dateOverride)` (guarded by `refreshRequest` counter; increments `dataRevision`), `addMeal(mealData)`, `editMeal(id, mealData)`, `removeMeal(id)`, `logWater(amountMl, date)`, `undoWater()`, `addExercise(exerciseData)`, `removeExercise(id)`. |
| [`useProfileStore.js`](file:///g:/calorie%20meter/src/stores/useProfileStore.js) | `profile: { name, age, gender, weight_kg, height_cm, activity_level, goal_type, custom_api_key }`, `goals: { calories, protein, carbs, fat, water_ml, exercise_minutes }`, `bmr`, `tdee`, `isLoading` | Named export `calculateMetabolism(profile)` (Mifflin-St Jeor BMR/TDEE + macro split for 5 activity levels: `sedentary`, `light`, `moderate`, `active`, `very_active`). Actions: `loadProfile()`, `saveProfile(newProfile, autoUpdateGoals=false)` (uses atomic `updateProfileAndGoals`), `saveGoals(newGoals)`. |
| [`useAIStore.js`](file:///g:/calorie%20meter/src/stores/useAIStore.js) | `messages: [INITIAL_GREETING]`, `isGenerating`, `isAnalyzing`, `dailyReview`, `isReviewing`, `mealPlan`, `isGeneratingPlan`, `error` | `sendUserMessage(text, userContext, onStreamUpdate)` (sends last 16 msgs, keeps 40 in UI), `clearChat()` (increments `conversationVersion++` to drop in-flight replies), `requestDailyReview(dailySummary, goals)`, `requestMealPlan(profile, goals, preferences)`, `clearError()`. |

---

## 4. Service Layer API Cheatsheet (`src/services/`)

- **[`geminiService.js`](file:///g:/calorie%20meter/src/services/geminiService.js)**:
  - Models: `PRIMARY_MODEL = 'gemini-3.5-flash-lite'`, `FALLBACK_MODEL = 'gemini-flash-lite-latest'`, `CHAT_MODEL = 'gemini-3.5-flash-lite'`.
  - Fast Inference: Sends `generationConfig.thinkingConfig: { thinkingBudget: 0 }`. Automatically falls back to standard config if model rejects (`thinkingConfigUnsupported = true`).
  - Two-Pass Lenient Vision: `isGenuineNoFood(p)` check triggers a second, more lenient retry pass before raising tagged `NO_FOOD` error.
  - Rate Limiter: 60 RPM custom key, 15 RPM shared. Internal retries set `isRetry: true` to prevent double-counting request tokens.
  - Functions: `getApiKey()`, `cleanBase64()`, `parseAndFormatGeminiError()`, `testGeminiApiKey()`, `cleanJsonText()`, `analyzeFoodPhoto()`, `analyzeNutritionLabel()`, `parseMealDescription()`, `sendNutritionistChatMessage()`, `generateDailyReview()`, `generatePersonalizedMealPlan()`, `estimateExerciseFromText()`, `getCurrentMealPeriod()`.
- **[`databaseService.js`](file:///g:/calorie%20meter/src/services/databaseService.js)**:
  - Dual-engine: Native `SQLite.openDatabaseAsync('caloriesnap.db')` (`PRAGMA journal_mode = WAL`) vs Web `localStorage('caloriesnap_web_db_v1')`.
  - Functions: `getTodayString(offsetDays)`, `formatDateKey()`, `formatTimeString()`, `initDatabase()`, `getMealsByDate()`, `insertMeal()`, `updateMeal()`, `deleteMealById()`, `getExercisesByDate()`, `insertExercise()`, `deleteExerciseById()`, `getWaterIntakeByDate()`, `addWaterIntake()`, `removeRecentWaterIntake()`, `getGoals()`, `updateGoals()`, `getProfile()`, `updateProfile()`, `updateProfileAndGoals()`, `getDailySummary()`, `get7DaySummary()`, `calculateStreakFromDates()`, `exportAllDataJSON()`, `importAllDataJSON()`, `factoryResetAllData()`, `clearAllLogs()`.
- **[`barcodeService.js`](file:///g:/calorie%20meter/src/services/barcodeService.js) & [`barcodeNutrition.js`](file:///g:/calorie%20meter/src/services/barcodeNutrition.js)**:
  - `lookupBarcode(barcode)`: Validates 8-14 digit code, queries OpenFoodFacts v2 (`15s` abort timeout).
  - `productToMeal(product, barcode)`: Normalizes per-serving vs per-100g, converts `kJ / 4.184` to kcal, calculates sodium from salt.
- **[`imageService.js`](file:///g:/calorie%20meter/src/services/imageService.js)**:
  - `persistImageAsync(tempUri)`: Native `documentDirectory + 'meals/'` vs Web IndexedDB (`CalorieSnapImagesDB`, `meal_images`, `10MB` limit, `indexeddb://img_...`).
  - `resolveImageUriAsync(uri)`: Resolves `indexeddb://` URIs to displayable `URL.createObjectURL(blob)`.
  - `deletePersistedImageAsync(uri)`: Deletes file from native disk or IndexedDB key.
- **[`notificationService.js`](file:///g:/calorie%20meter/src/services/notificationService.js)**:
  - Android Channel: `'reminders'` with `AndroidImportance.HIGH`, light `#6B9B7D`, vibration pattern `[0, 250, 250, 250]`.
  - 4 Daily Triggers: Breakfast (`8:30 AM`), Lunch (`1:15 PM`), Hydration (`4:30 PM`), Dinner/Review (`7:45 PM`).
  - Functions: `requestNotificationPermissions()`, `scheduleDailyReminders({ sendConfirmation })`, `areRemindersScheduled()`, `sendTestNotification()`, `ensureRemindersOnFirstLaunch()`, `cancelAllReminders()`.
- **[`exerciseCalculations.js`](file:///g:/calorie%20meter/src/services/exerciseCalculations.js)**:
  - `walkingStats(mode, duration, steps, pace, weight)`: MET energy calculations for 4 walking paces.
  - `presetCalories(preset, duration, intensity, weight)`: Scales 20 workout presets by user bodyweight and intensity.
  - `waterVolume(analysis, portion)`: Extracts water ml from string portions or default 250ml.
- **[`validation.js`](file:///g:/calorie%20meter/src/services/validation.js)**:
  - `validateDate()`, `validateMeal()`, `validateExercise()`, `validateProfile()`, `validateGoals()`, `validateBackup()`, `isPlainWater()`, `normalizeAnalysis()`, `normalizeMealPlan()`.
- **[`alertService.js`](file:///g:/calorie%20meter/src/services/alertService.js)**:
  - Cross-platform `Alert.alert`: Native `Alert.alert` vs Web `window.alert` / `window.confirm`.

---

## 5. UI Component & Theme Quick-Reference

### Theme Tokens ([`src/theme/colors.js`](file:///g:/calorie%20meter/src/theme/colors.js))
- **Colors**: `background: '#121214'`, `cardBackground: '#1C1C1E'`, `cardElevated: '#2C2C2E'`, `cardBorder: '#28282B'`, `sagePrimary: '#6B9B7D'`, `sageBright: '#7DAF8E'`, `protein: '#C9956B'`, `carbs: '#7BA7BC'`, `fat: '#C48B9F'`, `fiber: '#A8B878'`, `water: '#5B92E5'`, `caloriesBurned: '#E07A5F'`, `textPrimary: '#F2F2F7'`, `textSecondary: '#A1A1A6'`, `textTertiary: '#636366'`, `success: '#81B29A'`, `warning: '#F4A261'`, `error: '#E76F51'`.
- **Typography**: `display` (40/700), `title1` (28/700), `title2` (22/600), `title3` (18/600), `body` (15/400), `bodyMuted` (14/400), `callout` (13/500), `caption` (12/500), `micro` (10/600/uppercase).
- **Radius & Shadows**: `radius` (`xs: 6`, `sm: 10`, `md: 14`, `lg: 20`, `xl: 28`, `full: 9999`), `shadows` (`card`, `floating`, `subtle`).

### Camera & Capture UI Lifecycle
- **Instant Camera Unmount**: In [`LogMealScreen.js`](file:///g:/calorie%20meter/src/screens/LogMealScreen.js), clicking the shutter immediately calls `onCaptureStart(photo.uri)`. The live `<CameraView>` unmounts instantly to free GPU/camera hardware, mounting the dedicated **Captured Photo Analysis View**.
- **Captured Photo Analysis View**: Displays a framed preview of the captured photo, an animated laser scanning beam (`scanAnim`), live step status text, and a **Cancel & Retake** button (`handleCancelProcessing`).
- **Tray & Preview Mode**: When photos are staged in `<CameraScanner>`, a frozen preview card is shown. Live `<CameraView>` only mounts if tray is empty or user taps `+ Angle`.

---

## 6. Golden Invariants (Must Never Be Violated)

1. **Never Downgrade Gemini Models**: `PRIMARY_MODEL` and `CHAT_MODEL` must remain `gemini-3.5-flash-lite`, with fallback to `gemini-flash-lite-latest`. Do not revert to 2.x or 1.5 models.
2. **Never Double-Deduct Rate Limits**: Retries within `callGemini` must always pass `isRetry: true`.
3. **Validate Before Persistence**: Every database write in `databaseService.js` must pass through `validation.js`.
4. **Preserve Concurrency Locks**: Maintain `refreshRequest` (`useNutritionStore`), `conversationVersion` (`useAIStore`), `barcodeReqIdRef` & `saveLock` (`LogMealScreen`), `session` (`QuickAddModal`), and `estimateRequest` (`AddExerciseModal`).
5. **Sibling Controls in MealCard**: Keep Edit and Delete as sibling `<TouchableOpacity>` elements inside `topRow` (never nested, which breaks Web DOM).
6. **Local Calendar Dates**: Always use `getTodayString()` (`YYYY-MM-DD` local time), never UTC `.toISOString()`.
7. **Ensure Android Notification Channel**: Android 13+ requires high-importance channel `'reminders'` created before requesting permissions or scheduling.

---

## 7. Companion Knowledge Base Index (`.agent/knowledge/`)

- [`PROJECT_OVERVIEW.md`](file:///g:/calorie%20meter/.agent/knowledge/PROJECT_OVERVIEW.md) — System capabilities, active vs legacy repo boundary, tech stack, and boot lifecycle.
- [`FILE_MAP.md`](file:///g:/calorie%20meter/.agent/knowledge/FILE_MAP.md) — Exact file paths, line counts, exports, props, state, and task lookup table.
- [`ARCHITECTURE.md`](file:///g:/calorie%20meter/.agent/knowledge/ARCHITECTURE.md) — Viewport mechanics, camera lifecycle, Zustand concurrency, DB schema, and Gemini/OFF pipelines.
- [`FEATURE_MAP.md`](file:///g:/calorie%20meter/.agent/knowledge/FEATURE_MAP.md) — End-to-end execution flows for all features and coordinated multi-file change checklists.
- [`CONVENTIONS_AND_RISKS.md`](file:///g:/calorie%20meter/.agent/knowledge/CONVENTIONS_AND_RISKS.md) — Design tokens, A11y rules, Node VM test runner guide, and 40+ audited edge cases.
