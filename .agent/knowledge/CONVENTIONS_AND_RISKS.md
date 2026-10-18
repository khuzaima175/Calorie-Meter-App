# Conventions, Design Tokens, Testing & Risks — CalorieSnap Pro

> **Last Reviewed:** 2026-10-17 | **Git Revision:** `2f87a3e` (`main`) | **Test Suite:** 54/54 Passing (`npm test`)

---

## 1. Design System & Theme Tokens (`src/theme/colors.js`)

All UI components import `colors`, `typography`, `radius`, and `shadows` from [`src/theme/colors.js`](file:///g:/calorie%20meter/src/theme/colors.js). Never hardcode raw hex values when a token exists.

### Color Palette (`colors`)

| Category | Token Name | Value | Usage |
| :--- | :--- | :--- | :--- |
| **Backgrounds** | `background` | `'#121214'` | App root background (Warm Charcoal) |
| | `cardBackground` | `'#1C1C1E'` | Standard `<Card />` and list item surface |
| | `cardElevated` | `'#2C2C2E'` | Elevated cards, chips, modal surfaces |
| | `cardHover` | `'#3A3A3C'` | Pressed / hover state |
| | `cardBorder` / `borderLight` | `'#28282B'` / `'#3A3A3C'` | Hairline `1px` borders |
| **Brand Accent** | `sagePrimary` | `'#6B9B7D'` | Primary buttons, active tab icons, focus borders |
| | `sageBright` / `sageDark` | `'#7DAF8E'` / `'#4D735C'` | Laser beam, highlights, badges |
| | `sageSubtle` | `'rgba(107, 155, 125, 0.15)'` | Selected chip & badge backgrounds |
| **Macro Accents** | `protein` / `proteinBg` | `'#C9956B'` / `'rgba(201,149,107,0.15)'` | Warm Terracotta / Amber |
| | `carbs` / `carbsBg` | `'#7BA7BC'` / `'rgba(123,167,188,0.15)'` | Soft Slate Blue |
| | `fat` / `fatBg` | `'#C48B9F'` / `'rgba(196,139,159,0.15)'` | Muted Plum / Rose |
| | `fiber` | `'#A8B878'` | Olive Green |
| | `water` / `waterBg` | `'#5B92E5'` / `'rgba(91,146,229,0.15)'` | Cerulean Blue |
| | `caloriesBurned` / `Bg` | `'#E07A5F'` / `'rgba(224,122,95,0.15)'` | Warm Coral |
| **Typography** | `textPrimary` | `'#F2F2F7'` | Off-white primary text |
| | `textSecondary` | `'#A1A1A6'` | Muted grey labels & subtitles |
| | `textTertiary` | `'#636366'` | Placeholders, disabled text, micro labels |
| | `textInverse` | `'#121214'` | Text on bright buttons |
| **Semantic Status**| `success` / `warning` / `error` / `info` | `'#81B29A'` / `'#F4A261'` / `'#E76F51'` / `'#64B5F6'` | Status badges, error borders, alerts |

### Typography, Radius & Shadows
- **`typography`**:
  - `display`: `40px`, weight `'700'`, letterSpacing `-1`
  - `title1`: `28px`, weight `'700'`, letterSpacing `-0.5`
  - `title2`: `22px`, weight `'600'`, letterSpacing `-0.3`
  - `title3`: `18px`, weight `'600'`, letterSpacing `-0.2`
  - `body`: `15px`, weight `'400'`, lineHeight `22`
  - `bodyMuted`: `14px`, weight `'400'`, lineHeight `20`
  - `callout`: `13px`, weight `'500'`, letterSpacing `0.1`
  - `caption`: `12px`, weight `'500'`, letterSpacing `0.2`
  - `micro`: `10px`, weight `'600'`, letterSpacing `0.6`, `textTransform: 'uppercase'`
- **`radius`**: `xs: 6`, `sm: 10`, `md: 14`, `lg: 20`, `xl: 28`, `full: 9999`.
- **`shadows`**: `card` (`elevation: 3`), `floating` (`elevation: 8`), `subtle` (`elevation: 1`).

---

## 2. UI, Accessibility (A11y) & Cross-Platform Rules

1. **No Nested Interactive Controls (Critical for Web DOM)**:
   - Never nest a `<TouchableOpacity>` or `<Button>` inside another `<TouchableOpacity>`.
   - **Reference pattern ([`MealCard.js`](file:///g:/calorie%20meter/src/components/MealCard.js))**: Edit (`infoContainer` `TouchableOpacity`) and Delete (`deleteBtn` `TouchableOpacity`) are **siblings** inside `styles.topRow`, not parent/child.
2. **Mandatory Accessibility Props**:
   - All icon-only or custom interactive controls must set `accessibilityRole="button"` and a descriptive `accessibilityLabel`:
     - `MealCard`: `accessibilityLabel="Edit ${meal.name}, ${Math.round(meal.calories)} calories"` and `"Delete ${meal.name}"`.
     - `WaterTracker`: `accessibilityLabel="Undo last water intake log"`.
     - `Input`: Clear button uses `accessibilityLabel="Clear ${label || 'input'}"`.
     - `NutritionErrorBanner`: Uses `accessibilityRole="alert"`.
3. **Cross-Platform Confirmation Dialogs ([`src/services/alertService.js`](file:///g:/calorie%20meter/src/services/alertService.js))**:
   - Standard `Alert.alert` from `react-native` has no web implementation. All screens and components import `Alert` from `alertService.js`.
   - On web, it safely maps destructive dual-button alerts to `window.confirm` and runs the action callback asynchronously, preventing unhandled promise rejections.
4. **Local Calendar Date Strings (`YYYY-MM-DD`)**:
   - Always generate date strings via `getTodayString(offsetDays)` in [`src/services/databaseService.js`](file:///g:/calorie%20meter/src/services/databaseService.js).
   - Never use `new Date().toISOString().split('T')[0]`, which shifts dates across UTC midnight boundaries.
5. **Camera Hardware Lifecycle & Unmount**:
   - Hardware camera viewfinders (`CameraScanner.js`, `NutritionLabelScanner.js`) must unmount immediately upon shutter capture via `onCaptureStart(uri)`.
   - Never keep a live `<CameraView>` mounted during image processing or network transmission.

---

## 3. Test Suite & Custom Node VM Harness (`tests/`)

Run all 54 tests via:
```powershell
npm test
# Executes: node --test tests/*.test.js (54 tests across 6 test files)
```

### Test File Responsibilities
1. **[`tests/load-production.cjs`](file:///g:/calorie%20meter/tests/load-production.cjs)**:
   - Babel JSX/ESM-to-CommonJS in-memory compiler. Loads real production files inside Node's `vm` sandbox with configurable module mocks (`react-native`, `expo-sqlite`, `expo-notifications`, etc.).
2. **[`tests/async-forms.test.js`](file:///g:/calorie%20meter/tests/async-forms.test.js)**:
   - Deterministic, zero-DOM React functional component harness (`createHarness`).
   - Verifies camera capture lifecycle, instantaneous unmount of `<CameraView>`, mounting of Captured Photo Analysis View, laser animation, and `handleCancelProcessing` cancellation.
   - Tests concurrency locks (`activeRequestId`, `session`, `saveLock`, `estimateRequest`).
3. **[`tests/core-calculations.test.js`](file:///g:/calorie%20meter/tests/core-calculations.test.js)**:
   - Mifflin-St Jeor BMR/TDEE calculations across all 5 activity levels (`very_active` multiplier `1.9`).
   - MET walking formulas across 4 paces, workout preset scalers, water volume parsing, and date validation.
4. **[`tests/gemini-vision.test.js`](file:///g:/calorie%20meter/tests/gemini-vision.test.js)**:
   - Two-pass lenient vision retry: first pass non-food reports trigger second pass before failing.
   - Tagged `NO_FOOD` error throwing and confirmation that real estimates are trusted even if `is_no_food: true`.
   - Fast mode thinking budget rejection fallback (`thinkingConfigUnsupported`).
5. **[`tests/persistence.test.js`](file:///g:/calorie%20meter/tests/persistence.test.js)**:
   - SQLite and Web `localStorage` database CRUD for meals, exercises, water, profile, and goals.
   - Rollback of memory state on web quota exhaustion.
   - Backup JSON export and restore round-trips with schema validation.
6. **[`tests/store-and-services.test.js`](file:///g:/calorie%20meter/tests/store-and-services.test.js)**:
   - Zustand store concurrency: `refreshRequest` out-of-order race guards, `conversationVersion` stale chat response drop.
   - Notification service: Android channel configuration, 4 daily triggers, test notification banner.
   - Barcode normalization and macro scaling from OpenFoodFacts payloads.
7. **[`tests/ui-render.test.js`](file:///g:/calorie%20meter/tests/ui-render.test.js)**:
   - `CalorieRing` remaining calculation with exercise credit (`remaining = goal + burned - consumed`).
   - `MealCard` sibling touchable controls verification.

---

## 4. Security & Privacy Considerations

1. **Client-Side Gemini API Key**:
   - The user's personal Gemini API key is stored locally in SQLite (`user_profile.custom_api_key`) or read from `EXPO_PUBLIC_GEMINI_KEY`.
   - **Never** hardcode any real Gemini API key in source code, `app.json`, or documentation.
2. **Backup Sanitization (`exportAllDataJSON` / `importAllDataJSON`)**:
   - Exported JSON backups contain only user logs and profile targets (`user_profile`, `daily_goals`, `meals`, `water_intake`, `exercises`).
   - The user's `custom_api_key` and internal `settings` are **excluded** from exported JSON backups to prevent accidental credential leakage.

---

## 5. Known Limitations & Audited Fragile Areas

| Area | Fragile Point / Historical Bug | Current Hardened Guard (Do Not Break) |
| :--- | :--- | :--- |
| **Camera Viewport during AI (`LogMealScreen.js`)** | Keeping `<CameraView>` mounted during AI analysis locked camera hardware, heated device, and created confusing overlapping UI. | `onCaptureStart(photo.uri)` immediately unmounts `<CameraView>` and mounts the dedicated **Captured Photo Analysis View** with laser scan animation and cancel/retake. |
| **Rate Limiter on AI Retries (`geminiService.js`)** | Internal retries (fallback model, fast-mode rejection, lenient vision retry) deducted multiple tokens, causing premature 429 quota exhaustion. | Retries pass `isRetry: true`, which skips `recordRequest()`. |
| **Model Downgrade Prevention (`geminiService.js`)** | Code must use Gemini 3.5 series models (`gemini-3.5-flash-lite`), not legacy 2.x or 1.5 series. | `PRIMARY_MODEL = 'gemini-3.5-flash-lite'`, `FALLBACK_MODEL = 'gemini-flash-lite-latest'`, `CHAT_MODEL = 'gemini-3.5-flash-lite'`. |
| **Gemini 3.5 `thinkingConfig` & Schema Types (`geminiService.js`)** | Sending `thinkingBudget: 0` on Gemini 3.5 triggers HTTP 400 (`INVALID_ARGUMENT`), and `type: 'NUMBER'` in `responseSchema` can trigger 1,000-digit decimal runaway loops. | Use `thinkingConfig: { thinkingLevel: 'MINIMAL' }`, fall back on any non-key 400 when `useFastMode` is active, and use `type: 'INTEGER'` in `FOOD_ANALYSIS_SCHEMA` / `NUTRITION_LABEL_SCHEMA`. |
| **False-Positive Food Rejection (`geminiService.js`)** | Model set `is_no_food: true` on dim or angled food photos. | `isGenuineNoFood` checks if a valid food name and calories > 0 were returned. Two-pass lenient retry executes before throwing tagged `NO_FOOD` error. |
| **Android 13+ Notification Requirements (`notificationService.js`)** | Notifications failed silently on Android 13+ without an explicit high-importance channel. | `ensureAndroidChannel()` creates `'reminders'` with `AndroidImportance.HIGH` before permissions or scheduling. |
| **Exercise Credit in Assistant (`AssistantScreen.js`)** | Chat coach header remaining calories badge ignored calories burned during workouts. | Computes `netCalories = totalCalories - caloriesBurned` and `remaining = goal - netCalories`. |
| **Meal Edits (`QuickAddModal.js`, `databaseService.js`)** | Editing a meal previously dropped `image_uri`, `sugar`, or `sodium`. | `QuickAddModal` spreads `{ ...(editMeal \|\| {}) }`. `databaseService.js` checks for other references before deleting old image file. |
| **Zero-Calorie Meals (`QuickAddModal.js`, `FoodAnalysisResult.js`)** | `0 kcal` items (diet soda, black coffee, plain tea) were treated as falsy and rejected. | Checks `calories.trim() === ''` for blank input and accepts `Number(calories) >= 0`. |
| **Plain Water Recognition (`geminiService.js`, `validation.js`)** | Photo of a water glass was logged as a `0 kcal` food item. | `isPlainWater(analysis)` routes water captures directly to `logWater(amountMl, date)`. |
| **Barcode Infinite Scan Loop (`BarcodeScanner.js`)** | Barcode scanner kept firing repeatedly while product remained in front of lens. | `scanned` state remains `true` until user taps `"Scan Again"`. |
| **Stale Async Callbacks (Stores & Screens)** | Switching dates or tabs while an async request was in flight overwrote newer state. | Guarded by `refreshRequest` (`useNutritionStore`), `conversationVersion` (`useAIStore`), `barcodeReqIdRef` (`LogMealScreen`), `session` (`QuickAddModal`), and `estimateRequest` (`AddExerciseModal`). |
| **Web Storage Quota Rollback (`databaseService.js`)** | `QuotaExceededError` in browser `localStorage` corrupted data. | Deep clones state before mutations and rolls back on error. |
