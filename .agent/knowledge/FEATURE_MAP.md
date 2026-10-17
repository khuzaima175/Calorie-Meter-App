# Feature Map — CalorieSnap Pro

> **Last Reviewed:** 2026-10-17 | **Git Revision:** `2f87a3e` (`main`) | **Test Suite:** 54/54 Passing (`npm test`)

---

## 1. Feature Matrix & Entry Points

| # | Feature | UI Entry Point | Component Tree | Store Action | Service Functions |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **F1** | **Daily Dashboard & Date Navigation** | `DashboardScreen.js` | `DaySelector`, `NutritionErrorBanner`, `CalorieRing`, `MacroBar`, `MealSection`, `MealCard` | `useNutritionStore.setSelectedDate`, `refreshData`, `removeMeal` | `getMealsByDate`, `getExercisesByDate`, `getWaterIntakeByDate`, `deleteMealById` |
| **F2** | **7-Day Calorie Trends** | `DashboardScreen.js` | `WeeklyTrendsCard` | Reads `dataRevision`, calls `setSelectedDate` on bar tap | `get7DaySummary(selectedDate)` |
| **F3** | **Hydration Vial & Undo** | `DashboardScreen.js` | `WaterTracker` | `useNutritionStore.logWater`, `undoWater` | `addWaterIntake`, `removeRecentWaterIntake` |
| **F4** | **Quick Add / Edit Meal Modal** | `DashboardScreen.js` (`+ Add` or tap `MealCard`) | `QuickAddModal` | `useNutritionStore.addMeal`, `editMeal` | `parseMealDescription`, `insertMeal`, `updateMeal` |
| **F5** | **AI Food Photo Scanner (Single & Multi-Plate)** | `LogMealScreen.js` (`photo` tab) | `CameraScanner` -> Dedicated Analysis View -> `FoodAnalysisResult` | `useNutritionStore.addMeal` (or `logWater`) | `analyzeFoodPhoto`, `isPlainWater`, `waterVolume`, `persistImageAsync`, `insertMeal` |
| **F6** | **Nutrition Facts Label OCR** | `LogMealScreen.js` (`label` tab) | `NutritionLabelScanner` -> Dedicated Analysis View -> `FoodAnalysisResult` | `useNutritionStore.addMeal` | `analyzeNutritionLabel`, `persistImageAsync`, `insertMeal` |
| **F7** | **Barcode Scanner & Lookup** | `LogMealScreen.js` (`barcode` tab) | `BarcodeScanner` -> Dedicated Analysis View -> `FoodAnalysisResult` | `useNutritionStore.addMeal` | `lookupBarcode`, `productToMeal`, `insertMeal` |
| **F8** | **Natural Language Meal Input** | `LogMealScreen.js` (`text` tab) | `LogMealScreen` text view -> `FoodAnalysisResult` | `useNutritionStore.addMeal` | `parseMealDescription`, `insertMeal` |
| **F9** | **Manual Meal Form** | `LogMealScreen.js` (`manual` tab) | `LogMealScreen` manual form + AI auto-calc | `useNutritionStore.addMeal` | `parseMealDescription`, `insertMeal` |
| **F10** | **Activity Dashboard & Quick Walking** | `ActivityScreen.js` | `DaySelector`, `StatCard`, Quick Walk Card, `ExerciseCard` | `useNutritionStore.addExercise`, `removeExercise` | `walkingStats`, `insertExercise`, `deleteExerciseById` |
| **F11** | **3-Tab Workout Modal (Walking / Presets / AI)** | `ActivityScreen.js` (`+ Log Workout`) | `AddExerciseModal` | `useNutritionStore.addExercise` | `walkingStats`, `presetCalories`, `estimateExerciseFromText`, `insertExercise` |
| **F12** | **AI Coach Streaming Chat** | `AssistantScreen.js` (`chat` tab) | `AIChatBubble` (`TypingDots`, `BlinkingCursor`) | `useAIStore.sendUserMessage`, `clearChat` | `sendNutritionistChatMessage` |
| **F13** | **1-Tap AI Daily Log Review** | `AssistantScreen.js` (`Review Today's Log` pill) | `AssistantScreen` (`reviewCard`) | `useAIStore.requestDailyReview` | `generateDailyReview` |
| **F14** | **AI Daily Meal Planner & 1-Tap Log** | `AssistantScreen.js` (`plan` tab) | `MealPlanCard` | `useAIStore.requestMealPlan`, `useNutritionStore.addMeal` | `generatePersonalizedMealPlan`, `insertMeal` |
| **F15** | **Profile, BMR/TDEE & Macro Goals** | `SettingsScreen.js` | `SettingsScreen` (Profile & Goals sections) | `useProfileStore.saveProfile(data, true)`, `saveGoals` | `calculateMetabolism`, `updateProfileAndGoals`, `updateGoals` |
| **F16** | **Smart Local Daily Reminders** | `SettingsScreen.js` | `SettingsScreen` (Reminders Switch & Test button) | *(Direct service call)* | `scheduleDailyReminders`, `sendTestNotification`, `areRemindersScheduled`, `cancelAllReminders` |
| **F17** | **JSON Data Backup, Restore & Reset** | `SettingsScreen.js` | `SettingsScreen` (Data & Backup section) | Reloads stores on restore / reset | `exportAllDataJSON`, `importAllDataJSON`, `factoryResetAllData` |

---

## 2. Detailed Execution Flows & Component Contracts

### Flow 1: 5-Mode Meal Capture, Shutter-to-Analysis & Review (`LogMealScreen.js`)
1. **Mode Selection (`activeTab`)**:
   - Tabs: `'photo'`, `'label'`, `'barcode'`, `'text'`, `'manual'`.
   - Switching tabs increments `barcodeReqIdRef.current++` and resets state (`analysisResult`, `capturedImageUri`, `capturedImageUris`, `statusMessage`).
2. **Instant Camera Unmount & Shutter Hand-off**:
   - Tapping shutter calls `onCaptureStart(photo.uri)`.
   - `LogMealScreen` immediately sets `isProcessing = true`, unmounting `<CameraScanner>` / `<CameraView>` to release the camera hardware and GPU.
   - It transitions to **Captured Photo Analysis View**:
     - Framed photo preview of the captured shot.
     - Animated laser beam (`scanAnim`) sweeping vertically across the preview.
     - Live status badge (`GEMINI VISION AI`), title, and progress message.
     - **Cancel & Retake** button (`handleCancelProcessing`), allowing immediate cancellation and return to live camera.
3. **AI Vision & Two-Pass Lenient Retry (`analyzeFoodPhoto`)**:
   - Fast sub-second inference with `thinkingBudget: 0`.
   - `isGenuineNoFood(parsed)` guard inspects the response. If non-food is detected, it automatically executes a second, more lenient retry pass before giving up.
   - If the second pass also reports no food, throws tagged `error.code = 'NO_FOOD'`.
   - `LogMealScreen` catches `NO_FOOD` and displays an alert offering **Retake** or **Describe Instead** (switches to `'text'` tab).
4. **Post-Analysis Review (`<FoodAnalysisResult />`)**:
   - **Water Detection**: If `isPlainWater(analysis)` is true, renders hydration chips (`150..1000ml`), logging via `useNutritionStore.logWater`.
   - **Food Review**: Form allows editing name, portion, meal type, calories, protein, carbs, fat, fiber. Preserves hidden `sugar` and `sodium`.
   - **Save & Rollback (`handleSaveMeal`)**: Persists photo via `persistImageAsync`. If `addMeal` fails, immediately deletes the persisted image to avoid orphans.
5. **Form Reset on Save**:
   - Upon successful save of manual or analyzed meals, form state fields reset to empty defaults.

### Flow 2: Quick Add / Edit Meal Modal (`QuickAddModal.js`) & Manual Tab
- Opened from `DashboardScreen` (`+ Add` or tap a `<MealCard />`).
- **Session Isolation**: `session.current` increments on prop changes or modal close to drop late responses.
- **Save Logic**:
   - Blank calories auto-calc: If `calories.trim() === ''`, calls `parseMealDescription(portion ? `${name} (${portion})` : name)`.
   - Accepts 0 kcal items (`calories >= 0`).
   - Preserves `image_uri`, `sugar`, `sodium`, and `logged_at` on meal edit by spreading `{ ...(editMeal || {}) }`.

### Flow 3: Exercise Tracking (`ActivityScreen.js`, `AddExerciseModal.js`)
1. **Quick Log Walking**:
   - 4 paces: `casual` (3.0 mph / MET 3.0), `moderate` (3.5 mph / MET 3.8), `brisk` (4.0 mph / MET 4.8), `incline` (3.5 mph / MET 6.0).
   - Log by minutes or steps. Steps are converted using `pace.stepsPerMin`.
   - `ExerciseCard.js` renders a distinct walking icon (`walk-outline`, `#7DAF8E`).
2. **3-Tab Workout Modal**:
   - **Tab 1 (`walking`)**: Duration or steps input with live `walkingStats` preview.
   - **Tab 2 (`presets`)**: 20 presets across `cardio`, `strength`, `sports`, `flexibility`, scaled via `presetCalories`.
   - **Tab 3 (`ai`)**: Parses user workout description using `estimateExerciseFromText`.

### Flow 4: AI Nutritionist Coach (`AssistantScreen.js`)
1. **Context Construction & Exercise Burn Credit**:
   - Reads `dailyTotals` (`totalCalories`, `caloriesBurned`, `netCalories`).
   - Header badge displays remaining calories factoring in exercise burn: `remaining = goal - netCalories`.
2. **Streaming Chat**:
   - Calls `sendNutritionistChatMessage` with last 16 completed messages.
   - Clear chat increments `conversationVersion++` and prompts for confirmation (`Alert.alert` on native, `window.confirm` on web).
3. **Daily Review & Meal Plan**:
   - 1-tap review evaluates logged meals against goals.
   - Meal plan generates 4 meals with 1-tap logging (`MealPlanCard`).

### Flow 5: Daily Reminders & Notifications (`SettingsScreen.js`, `notificationService.js`)
1. **Android Channel**:
   - Configures `'reminders'` with `AndroidImportance.HIGH`, light `#6B9B7D`, and custom vibration.
2. **4 Daily Triggers**:
   - Breakfast (8:30 AM), Lunch (1:15 PM), Hydration (4:30 PM), Dinner/Review (7:45 PM).
3. **Test Notification**:
   - Tapping "Send Test Notification" in `SettingsScreen` sends an immediate notification banner for instant user verification.

---

## 3. Coordinated Multi-File Change Checklists

- **Checklist A — Modifying Meal Schema or Nutrients**:
  1. [`src/services/validation.js`](file:///g:/calorie%20meter/src/services/validation.js): `validateMeal`
  2. [`src/services/databaseService.js`](file:///g:/calorie%20meter/src/services/databaseService.js): `CREATE TABLE`, migrations, `insertMeal`, `updateMeal`, `importAllDataJSON`
  3. [`src/services/geminiService.js`](file:///g:/calorie%20meter/src/services/geminiService.js): JSON schema in `FOOD_ANALYSIS_SCHEMA`, `analyzeFoodPhoto`, `analyzeNutritionLabel`, `parseMealDescription`
  4. [`src/services/barcodeNutrition.js`](file:///g:/calorie%20meter/src/services/barcodeNutrition.js): `productToMeal`
  5. UI forms: [`FoodAnalysisResult.js`](file:///g:/calorie%20meter/src/components/FoodAnalysisResult.js), [`QuickAddModal.js`](file:///g:/calorie%20meter/src/components/QuickAddModal.js), [`LogMealScreen.js`](file:///g:/calorie%20meter/src/screens/LogMealScreen.js)
  6. [`src/stores/useNutritionStore.js`](file:///g:/calorie%20meter/src/stores/useNutritionStore.js): `dailyTotals` reducer
- **Checklist B — Modifying Notification Schedules or Content**:
  1. [`src/services/notificationService.js`](file:///g:/calorie%20meter/src/services/notificationService.js): `scheduleDailyReminders`, `dailyTrigger`
  2. [`src/screens/SettingsScreen.js`](file:///g:/calorie%20meter/src/screens/SettingsScreen.js): reminder summary labels & toggle
  3. [`app.json`](file:///g:/calorie%20meter/app.json): notification permissions
- **Checklist C — Adding an Exercise Category or Preset**:
  1. [`src/services/exerciseCalculations.js`](file:///g:/calorie%20meter/src/services/exerciseCalculations.js): `presetCalories`
  2. [`src/components/AddExerciseModal.js`](file:///g:/calorie%20meter/src/components/AddExerciseModal.js): `PRESETS` array
  3. [`src/components/ExerciseCard.js`](file:///g:/calorie%20meter/src/components/ExerciseCard.js): category icon & color mapping
  4. [`src/services/validation.js`](file:///g:/calorie%20meter/src/services/validation.js): `validateExercise`
