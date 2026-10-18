# File Map — CalorieSnap Pro

> **Last Reviewed:** 2026-10-17 | **Git Revision:** `2f87a3e` (`main`) | **Test Suite:** 54/54 Passing (`npm test`)

---

## 1. Compact Directory Structure

```text
calorie meter/
├── index.js                         # Expo entry point -> registerRootComponent(App)
├── app.json                         # Expo config (slug: caloriesnap-pro, dark UI, camera & notification permissions)
├── package.json                     # Dependencies & scripts (start, android, ios, web, test)
├── src/                             # ACTIVE APPLICATION SOURCE (43 JS files)
│   ├── App.js                       # Root shell, web CSS injector, AppBootstrapper, retry screen
│   ├── theme/
│   │   └── colors.js                # Design tokens: colors, typography, radius, shadows
│   ├── navigation/
│   │   └── TabNavigator.js          # Custom 5-tab navigator, safe-area math, keyboard listener
│   ├── stores/                      # Zustand v5 state stores (3 files)
│   │   ├── useNutritionStore.js     # Selected date, meals/exercises/water, dailyTotals, dataRevision
│   │   ├── useProfileStore.js       # User profile, daily goals, calculateMetabolism (BMR/TDEE)
│   │   └── useAIStore.js            # AI chat messages, streaming, daily review, meal planner
│   ├── services/                    # Data, AI, hardware, calculations & validation layer (9 files)
│   │   ├── alertService.js          # Cross-platform Alert/Confirm dialogs (Native Alert vs Web window.alert/confirm)
│   │   ├── barcodeNutrition.js      # OpenFoodFacts product nutriment parser & kJ->kcal normalizer
│   │   ├── barcodeService.js        # OpenFoodFacts v2 REST client with abort timeout
│   │   ├── databaseService.js       # Dual-engine persistence (Native SQLite + Web localStorage)
│   │   ├── exerciseCalculations.js  # Pure MET walking formulas, workout presets & water volume math
│   │   ├── geminiService.js         # Gemini 3.5 REST client, vision retry, label OCR, chat, meal plan
│   │   ├── imageService.js          # Image persistence (Native FileSystem + Web IndexedDB)
│   │   ├── notificationService.js   # Android reminders channel & 4 daily recurring triggers
│   │   └── validation.js            # Domain entity validators, backup validation & plain water check
│   ├── screens/                     # Top-level route views (5 files)
│   │   ├── DashboardScreen.js       # Daily summary, CalorieRing, MacroBar, WaterTracker, MealSections
│   │   ├── LogMealScreen.js         # 5-mode capture + Dedicated Photo Analysis View + FoodAnalysisResult
│   │   ├── ActivityScreen.js        # Burned calories, workout log, walking quick-entry, AI tips
│   │   ├── AssistantScreen.js       # Streaming AI coach chat, 1-tap Daily Review, AI Meal Plan UI
│   │   └── SettingsScreen.js        # Gemini API key, profile/BMR calculator, macro goals, notifications, backup
│   └── components/                  # Reusable UI widgets, modals & hardware scanners (24 files)
└── tests/                           # Node test runner suite (6 test suites + 1 Babel/VM loader)
    ├── load-production.cjs          # Babel JSX/ESM-to-CommonJS VM loader with configurable mocks
    ├── async-forms.test.js          # React hook harness testing screens, camera unmount, modals & concurrency
    ├── core-calculations.test.js    # BMR, TDEE, walking METs, presets, water parsing & validation tests
    ├── gemini-vision.test.js        # Two-pass vision retry, NO_FOOD error tagging & fast-mode tests
    ├── persistence.test.js          # SQLite & Web DB CRUD, rollback on quota error & backup tests
    ├── store-and-services.test.js   # Store concurrency, chat race, notification channel & barcode tests
    └── ui-render.test.js            # CalorieRing net calorie display, MealCard sibling touchables
```

---

## 2. Entry, Theme & Navigation Files

| File Path | Lines | Key Exports & Internal State | Responsibilities & Imports |
| :--- | :---: | :--- | :--- |
| [`index.js`](file:///g:/calorie%20meter/index.js) | 6 | *(side-effect)* `registerRootComponent(App)` | Registers [`src/App.js`](file:///g:/calorie%20meter/src/App.js) with Expo. |
| [`src/App.js`](file:///g:/calorie%20meter/src/App.js) | 119 | `default App` (`AppBootstrapper` internal: `isReady`, `bootError`, `attempt`) | Injects web root CSS (`#121214`), wraps `<SafeAreaProvider>` + `<ErrorBoundary>`, runs boot sequence (`initDatabase` -> `loadProfile` -> `refreshData` -> `ensureRemindersOnFirstLaunch`), shows `<LoadingShimmer />` or retry screen on error, renders `<OfflineBanner />` + `<TabNavigator />` in `maxWidth: 460` shell. |
| [`src/theme/colors.js`](file:///g:/calorie%20meter/src/theme/colors.js) | 128 | `colors`, `typography`, `radius`, `shadows`, `default` | Warm Minimalism palette (`background: '#121214'`, `sagePrimary: '#6B9B7D'`, `sageBright: '#7DAF8E'`, earth-tone macro colors), font scale (`display` 40px down to `micro` 10px), border radii (`xs: 6` to `full: 9999`), and platform shadows. Zero external imports. |
| [`src/navigation/TabNavigator.js`](file:///g:/calorie%20meter/src/navigation/TabNavigator.js) | 206 | `default TabNavigator` (state: `activeRoute`, `isKeyboardVisible`; ref: `scaleAnim`) | Renders active screen from `TABS` (`Dashboard`, `Activity`, `LogMeal`, `Assistant`, `Settings`). Passes `navigation={{ navigate }}`. Hides bottom bar when `activeRoute === 'LogMeal' \|\| isKeyboardVisible`. Computes `bottomPad = Math.max(insets.bottom, 8)`, `tabBarHeight = 56 + bottomPad`. |

---

## 3. State Stores (`src/stores/`)

| File Path | Lines | Exported Symbols & Signatures | State Shape & Key Dependencies |
| :--- | :---: | :--- | :--- |
| [`src/stores/useNutritionStore.js`](file:///g:/calorie%20meter/src/stores/useNutritionStore.js) | 119 | `useNutritionStore` (`setSelectedDate(date)`, `refreshData(dateOverride)`, `addMeal(mealData)`, `editMeal(id, mealData)`, `removeMeal(id)`, `logWater(amountMl, date)`, `undoWater()`, `addExercise(exerciseData)`, `removeExercise(id)`) | **State**: `selectedDate`, `meals: []`, `exercises: []`, `waterEntries: []`, `isLoading`, `error`, `dataRevision: 0`, `dailyTotals: { calories, protein, carbs, fat, fiber, water, caloriesBurned, activeMinutes, netCalories }`. Uses module-level `refreshRequest` counter to drop stale responses. Imports `databaseService.js`, `validation.js`. |
| [`src/stores/useProfileStore.js`](file:///g:/calorie%20meter/src/stores/useProfileStore.js) | 136 | `calculateMetabolism(profile)` -> `{ bmr, tdee, suggestedCalories, suggestedProtein, suggestedCarbs, suggestedFat, suggestedWater }`<br/>`useProfileStore` (`loadProfile()`, `saveProfile(newProfile, autoUpdateGoals=false)`, `saveGoals(newGoals)`) | **State**: `profile` (`name`, `gender`, `age`, `weight_kg`, `height_cm`, `activity_level`, `goal_type`, `custom_api_key`), `goals` (`calories`, `protein`, `carbs`, `fat`, `water_ml`, `exercise_minutes`), `bmr`, `tdee`, `isLoading`. Uses atomic `updateProfileAndGoals` when `autoUpdateGoals === true`. 5 activity levels supported (`sedentary`, `light`, `moderate`, `active`, `very_active`). Imports `databaseService.js`. |
| [`src/stores/useAIStore.js`](file:///g:/calorie%20meter/src/stores/useAIStore.js) | 132 | `useAIStore` (`sendUserMessage(text, userContext, onStreamUpdate)`, `clearChat()`, `requestDailyReview(dailySummary, goals)`, `requestMealPlan(profile, goals, preferences)`, `clearError()`) | **State**: `messages: [INITIAL_GREETING]`, `isGenerating`, `isAnalyzing`, `dailyReview`, `isReviewing`, `mealPlan`, `isGeneratingPlan`, `error`. Uses module-level `conversationVersion` counter incremented by `clearChat()` to discard in-flight responses. Sends last 16 msgs as context. Imports `geminiService.js`. |

---

## 4. Service Layer (`src/services/`)

| File Path | Lines | Exported Functions & Constants | Responsibilities & Storage Keys |
| :--- | :---: | :--- | :--- |
| [`src/services/alertService.js`](file:///g:/calorie%20meter/src/services/alertService.js) | 20 | `Alert.alert(title, message, buttons, options)` | Cross-platform alert/confirm wrapper. Native calls `NativeAlert.alert`. Web converts to `window.alert` or `window.confirm` for destructive/dual-button dialogues, ensuring async action callbacks execute reliably. |
| [`src/services/barcodeNutrition.js`](file:///g:/calorie%20meter/src/services/barcodeNutrition.js) | 45 | `productToMeal(product, barcode)` | Standardizes OpenFoodFacts product nutriments. Resolves serving size vs per-100g basis, converts `energy` kJ (`kJ / 4.184`) if kcal is missing, calculates sodium from salt (`* 0.4`), and sets `source: 'OpenFoodFacts'`. |
| [`src/services/barcodeService.js`](file:///g:/calorie%20meter/src/services/barcodeService.js) | 17 | `lookupBarcode(barcode)` | Validates numeric barcode (`8-14` digits), fetches `https://world.openfoodfacts.org/api/v2/product/{code}.json` with `15s` `AbortController` timeout, parses via `productToMeal`. |
| [`src/services/databaseService.js`](file:///g:/calorie%20meter/src/services/databaseService.js) | 841 | `getTodayString(offsetDays)`, `formatDateKey(date)`, `formatTimeString(isoString)`, `initDatabase()`, `getMealsByDate(date)`, `insertMeal(meal)`, `updateMeal(id, meal)`, `deleteMealById(id)`, `getExercisesByDate(date)`, `insertExercise(exercise)`, `deleteExerciseById(id)`, `getWaterIntakeByDate(date)`, `addWaterIntake(amountMl, date)`, `removeRecentWaterIntake(date)`, `getGoals()`, `updateGoals(goals)`, `getProfile()`, `updateProfile(profile)`, `updateProfileAndGoals(profile, goals)`, `seedDemoDataIfEmpty()`, `resetDatabaseToDemo()`, `factoryResetAllData()`, `clearAllLogs()`, `exportAllDataJSON()`, `importAllDataJSON(jsonString)`, `getDailySummary(date)`, `get7DaySummary(endDate)`, `calculateStreakFromDates(uniqueDateList, todayStr)` | Dual-engine persistence. **Native**: `expo-sqlite` (`caloriesnap.db`, WAL mode). **Web**: `localStorage` (`caloriesnap_web_db_v1`) with deep cloning and rollback on quota errors. Synchronizes image file cleanup with `imageService.js`. |
| [`src/services/exerciseCalculations.js`](file:///g:/calorie%20meter/src/services/exerciseCalculations.js) | 25 | `walkingStats(mode, duration, steps, pace, weight)`, `presetCalories(preset, duration, intensity, weight)`, `waterVolume(analysis, portion)` | Pure physical calculations. Computes distance, steps, and MET calories for 4 walking paces. Scales workout presets by user bodyweight and intensity (`low: 0.85`, `moderate: 1.0`, `high: 1.2`). Extracts water volume from string portions. |
| [`src/services/geminiService.js`](file:///g:/calorie%20meter/src/services/geminiService.js) | 994 | `getCurrentMealPeriod()`, `getApiKey()`, `cleanBase64(str)`, `parseAndFormatGeminiError(errorInput, status)`, `testGeminiApiKey(candidateKey)`, `cleanJsonText(rawText)`, `analyzeFoodPhoto(photosInput, mimeType, context)`, `analyzeNutritionLabel(base64Image, mimeType)`, `parseMealDescription(textInput, context)`, `estimateTokens(str)`, `sanitizeChatHistory(history, newTurnText, maxTokenBudget)`, `sendNutritionistChatMessage(chatHistory, userMessage, userContext)`, `generateDailyReview(dailySummary, goals)`, `generatePersonalizedMealPlan(profile, goals, preferences)`, `estimateExerciseFromText(text, userWeightKg)` | Multi-model Gemini client (`PRIMARY_MODEL = 'gemini-3.5-flash-lite'`, `FALLBACK_MODEL = 'gemini-flash-lite-latest'`). Fast mode sends `thinkingLevel: 'MINIMAL'`, automatically falling back on non-key 400s. Two-pass lenient vision retry (`isGenuineNoFood`) before throwing tagged `NO_FOOD` error. 60/15 RPM rolling rate limiter protects retries with `isRetry: true`. |
| [`src/services/imageService.js`](file:///g:/calorie%20meter/src/services/imageService.js) | 180 | `persistImageAsync(tempUri)`, `deletePersistedImageAsync(imageUri)`, `resolveImageUriAsync(uri)` | Cross-platform image storage. **Native**: copies to `FileSystem.documentDirectory + 'meals/'`. **Web**: persists `Blob` into IndexedDB (`CalorieSnapImagesDB`, store `meal_images`, 10MB limit) under `indexeddb://img_...` keys and resolves to `URL.createObjectURL(blob)`. |
| [`src/services/notificationService.js`](file:///g:/calorie%20meter/src/services/notificationService.js) | 252 | `areRemindersScheduled()`, `requestNotificationPermissions()`, `sendTestNotification(title, body)`, `scheduleDailyReminders(options)`, `ensureRemindersOnFirstLaunch()`, `cancelAllReminders()` | Local notification manager. Android creates high-importance `'reminders'` channel. Schedules 4 daily triggers: Breakfast (8:30 AM), Lunch (1:15 PM), Hydration (4:30 PM), Dinner (7:45 PM). Immediate verification via `sendTestNotification`. No-op on web. |
| [`src/services/validation.js`](file:///g:/calorie%20meter/src/services/validation.js) | 101 | `numberInRange(value, label, min, max)`, `validateDate(date)`, `validateMeal(meal)`, `validateExercise(exercise)`, `validateProfile(profile)`, `validateGoals(goals)`, `validateBackup(backup)`, `isPlainWater(analysis)`, `normalizeAnalysis(analysis)`, `normalizeMealPlan(plan)` | Entity boundary validation and sanitization. Protects stores and database from NaN, Infinity, negative values, and corrupted JSON payloads. |

---

## 5. Screens (`src/screens/`)

| File Path | Lines | Props & Local State | Key Sub-Components & Flows |
| :--- | :---: | :--- | :--- |
| [`src/screens/DashboardScreen.js`](file:///g:/calorie%20meter/src/screens/DashboardScreen.js) | 445 | **Props**: `{ navigation }`<br/>**State**: `quickAddVisible`, `quickAddMealType`, `editingMeal`, `refreshing` | Header greeting (`Good Morning/Afternoon/Evening, {firstName}`), date formatting for past/future days (`EEE, MMM d`), `<DaySelector />`, `<NutritionErrorBanner />`, hero card (`<CalorieRing />` + `<MacroBar />`), `<WaterTracker />`, `<WeeklyTrendsCard />`, 4 `<MealSection />` blocks (`breakfast`, `lunch`, `dinner`, `snack`), and `<QuickAddModal />`. |
| [`src/screens/LogMealScreen.js`](file:///g:/calorie%20meter/src/screens/LogMealScreen.js) | 1368 | **Props**: `{ navigation }`<br/>**State**: `activeTab` (`'photo'`\|`'label'`\|`'barcode'`\|`'text'`\|`'manual'`), `isProcessing`, `isSaving`, `statusMessage`, `analysisResult`, `capturedImageUri`, `capturedImageUris`, `textDescription`, `manual*`<br/>**Refs**: `barcodeReqIdRef`, `pendingCaptureId`, `mounted`, `saveLock`, `scanAnim` | 5 capture modes. When `isCameraMode && isProcessing`, unmounts live `<CameraView>` and mounts dedicated **Captured Photo Analysis View** (framed photo preview, laser scan beam, live progress, Cancel & Retake). Tagged `NO_FOOD` error triggers dialog to retake or switch to Describe. Form resets on save. |
| [`src/screens/ActivityScreen.js`](file:///g:/calorie%20meter/src/screens/ActivityScreen.js) | 480 | **Props**: `{ navigation }`<br/>**State**: `modalVisible`, `refreshing`, `quickWalkMin`, `quickWalkPace`, `quickSteps` | `<DaySelector />`, `<NutritionErrorBanner />`, 2 `<StatCard />` (`Burned` kcal & `Active` mins), Quick Log Walking card (pace chips + duration/steps inputs + `"Log"` buttons), `<ExerciseCard />` list (includes walking icon), AI Recovery Tip card, and `<AddExerciseModal />`. |
| [`src/screens/AssistantScreen.js`](file:///g:/calorie%20meter/src/screens/AssistantScreen.js) | 448 | **Props**: `{ navigation }`<br/>**State**: `inputText`, `activeTab` (`'chat'`\|`'plan'`), `dietPreference` | Top switcher (`Chat Coach` vs `AI Meal Plan`). Header displays remaining calories badge factoring in exercise burn (`netCalories`). Confirmation dialog on clear chat. **Chat tab**: action pills, `FlatList` of `<AIChatBubble />`, text composer. **Plan tab**: diet chips, `"Generate Meal Plan"`, `<MealPlanCard />` with 1-tap logging. |
| [`src/screens/SettingsScreen.js`](file:///g:/calorie%20meter/src/screens/SettingsScreen.js) | 1266 | **Props**: `{ navigation }`<br/>**State**: `apiKeyInput`, `hasKey`, `keyStatusMsg`, `name`, `age`, `gender`, `weight`, `height`, `activityLevel` (5 levels), `goalType`, `caloriesGoal`, `proteinGoal`, `carbsGoal`, `fatGoal`, `waterGoal`, `remindersEnabled`, `isExporting`, `isImporting` | 5 sections: 1. Gemini AI Configuration (`testGeminiApiKey`), 2. Personal Profile & BMR (`saveProfile(data, true)` with `very_active` support), 3. Daily Macro Targets (`saveGoals`), 4. Daily Reminders (toggle, confirmation banner, `"Send Test Notification"` button), 5. Data & Backup (`exportAllDataJSON`, `importAllDataJSON`, Factory Reset). |

---

## 6. UI Components (`src/components/`)

| File Path | Lines | Accepted Props | UI Role, Animations & Key Implementation Details |
| :--- | :---: | :--- | :--- |
| [`src/components/AddExerciseModal.js`](file:///g:/calorie%20meter/src/components/AddExerciseModal.js) | 961 | `{ visible, onClose, onSave, userWeightKg=75, date }` | Exports `WALKING_PACES`, `PRESETS`. 3 tabs (`walking`, `presets`, `ai`). Uses `estimateRequest.current` and `savePending.current` locks. |
| [`src/components/AIChatBubble.js`](file:///g:/calorie%20meter/src/components/AIChatBubble.js) | 302 | `{ message, onQuickReplyPress }` | Chat bubbles, `TypingDots` when streaming without text, `BlinkingCursor` while streaming, line-by-line markdown parser, quick-reply chips. |
| [`src/components/BarcodeScanner.js`](file:///g:/calorie%20meter/src/components/BarcodeScanner.js) | 416 | `{ onScanBarcode, isProcessing=false }` | Fullscreen `<CameraView>` with laser line and `scanLock`/`lookupPending` refs. Remains locked until `"Scan Again"` is tapped. Manual barcode input overlay. |
| [`src/components/Button.js`](file:///g:/calorie%20meter/src/components/Button.js) | 239 | `{ title, onPress, variant='primary', size='md', iconLeft, iconRight, disabled=false, loading=false, fullWidth=false, ...a11y }` | 5 variants (`primary`, `secondary`, `outline`, `ghost`, `danger`), 3 sizes (`sm`, `md`, `lg`). Spring press scale (`0.96`), `ActivityIndicator` on loading. |
| [`src/components/CalorieRing.js`](file:///g:/calorie%20meter/src/components/CalorieRing.js) | 128 | `{ consumed=0, goal=2000, burned=0, size=180, strokeWidth=14 }` | SVG circular progress ring. Computes `remaining = goal + burned - consumed` and displays over-target warning in `colors.error`. |
| [`src/components/CameraScanner.js`](file:///g:/calorie%20meter/src/components/CameraScanner.js) | 985 | `{ onCapturePhoto, onCaptureStart, onCaptureAbort, isProcessing=false }` | Shutter tap immediately calls `onCaptureStart(uri)`. Resizes to `896px` (`0.62` JPEG). Frozen preview card when tray has photos (`+ Angle` reactivates camera). Portion chips, custom notes, gallery/system camera fallbacks. |
| [`src/components/Card.js`](file:///g:/calorie%20meter/src/components/Card.js) | 49 | `{ children, style, onPress, elevated=false, noPadding=false, activeOpacity=0.75 }` | Surface wrapper (`cardBackground` or `cardElevated`). Uses `TouchableOpacity` (`accessibilityRole="button"`) if `onPress` is passed, else `View`. |
| [`src/components/DaySelector.js`](file:///g:/calorie%20meter/src/components/DaySelector.js) | 137 | `{ selectedDate, onSelectDate }` | Date navigation bar (`prev` / `next` arrows + `"Jump to Today"` pill). Disables `next` arrow when viewing today. |
| [`src/components/ErrorBoundary.js`](file:///g:/calorie%20meter/src/components/ErrorBoundary.js) | 125 | `default ErrorBoundary` | React class boundary catching render crashes, providing `"Reload Screen"` recovery. |
| [`src/components/ExerciseCard.js`](file:///g:/calorie%20meter/src/components/ExerciseCard.js) | 163 | `{ exercise, onDelete }` | Displays logged workout (`name`, `duration_minutes`, `intensity`, `calories_burned`) with category color/icon (including `walking` `walk-outline` in `#7DAF8E`) and delete confirmation. |
| [`src/components/FoodAnalysisResult.js`](file:///g:/calorie%20meter/src/components/FoodAnalysisResult.js) | 590 | `{ analysis, imageUri, imageUris, isSaving=false, onSave, onCancel, onSwitchToText }` | Post-AI review form. Handles hydration volume chips (`is_water`), macro editing form preserving `sugar` and `sodium`, plate count indicators, and save button. |
| [`src/components/Input.js`](file:///g:/calorie%20meter/src/components/Input.js) | 174 | `{ label, value, onChangeText, placeholder, unit, error, clearable=false, ...props }` | Text input with focus border (`colors.sagePrimary`), unit badge, clear button (`accessibilityLabel="Clear ${label}"`), error line. |
| [`src/components/LoadingShimmer.js`](file:///g:/calorie%20meter/src/components/LoadingShimmer.js) | 139 | `default LoadingShimmer` | Pulsing skeleton layout displayed during initial app bootstrap. |
| [`src/components/MacroBar.js`](file:///g:/calorie%20meter/src/components/MacroBar.js) | 149 | `{ protein=0, proteinGoal=140, carbs=0, carbsGoal=220, fat=0, fatGoal=65, style }` | 3 animated horizontal progress bars for Protein (`#C9956B`), Carbs (`#7BA7BC`), and Fat (`#C48B9F`). |
| [`src/components/MealCard.js`](file:///g:/calorie%20meter/src/components/MealCard.js) | 194 | `{ meal, onDelete, onPress }` | Resolves `meal.image_uri` via `resolveImageUriAsync`. Renders **sibling** Edit and Delete `TouchableOpacity` controls inside `topRow` (never nested). |
| [`src/components/MealPlanCard.js`](file:///g:/calorie%20meter/src/components/MealPlanCard.js) | 268 | `{ plan, onLogMealItem }` | Expandable 4-meal plan card (`breakfast`, `lunch`, `dinner`, `snack`) with ingredients, instructions, and `"Log This Meal"` button guarded by `saving` ref lock. |
| [`src/components/MealSection.js`](file:///g:/calorie%20meter/src/components/MealSection.js) | 165 | `{ type='breakfast', meals=[], onAddPress, onDeleteMeal, onMealPress }` | Category group with calorie sum, `+ Add` button, and `<MealCard />` list or dashed empty state. |
| [`src/components/NutritionErrorBanner.js`](file:///g:/calorie%20meter/src/components/NutritionErrorBanner.js) | 14 | `default NutritionErrorBanner` | Reads `error` & `refreshData` from `useNutritionStore`; renders `accessibilityRole="alert"` banner with retry button. |
| [`src/components/NutritionLabelScanner.js`](file:///g:/calorie%20meter/src/components/NutritionLabelScanner.js) | 494 | `{ onCaptureLabel, onCaptureStart, onCaptureAbort, isProcessing=false }` | Fullscreen `<CameraView>` with rectangular label guide frame. Shutter tap calls `onCaptureStart(uri)`. Resizes to `1600px` (`0.82` JPEG) for micro-text OCR. Remounts after 120ms layout pass. |
| [`src/components/OfflineBanner.js`](file:///g:/calorie%20meter/src/components/OfflineBanner.js) | 57 | `default OfflineBanner` | Listens to web `window` `'online'`/`'offline'` events; slides down an orange (`#C85A32`) banner when offline. |
| [`src/components/QuickAddModal.js`](file:///g:/calorie%20meter/src/components/QuickAddModal.js) | 434 | `{ visible, onClose, onSave, initialMealType='snack', editMeal=null, date }` | Manual meal modal + `"Auto-Calculate Macros with AI"`. `session.current` lock. Spreads `editMeal` to preserve image, sugar, and sodium. |
| [`src/components/StatCard.js`](file:///g:/calorie%20meter/src/components/StatCard.js) | 89 | `{ icon, iconBgColor, value, unit, label, subtitle, onPress, style }` | Metric summary card used in `ActivityScreen` for Burned kcal and Active minutes. |
| [`src/components/WaterTracker.js`](file:///g:/calorie%20meter/src/components/WaterTracker.js) | 295 | `{ current=0, goal=2500, onAddWater, onUndoWater, style }` | Animated vertical liquid vial with SVG wave, droplet animation, `+250 ml` & `+500 ml` buttons, and Undo button. |
| [`src/components/WeeklyTrendsCard.js`](file:///g:/calorie%20meter/src/components/WeeklyTrendsCard.js) | 252 | `{ selectedDate, targetCalories=2000, onSelectDate }` | Subscribes to `useNutritionStore(s => s.dataRevision)`. Fetches `get7DaySummary(selectedDate)` and renders 7 clickable bar columns, goal line, and average badge. |

---

## 7. Quick Task-to-File Lookup Guide

| If the task involves... | Inspect / Modify these exact files |
| :--- | :--- |
| **Adding a column or field to `meals` or `exercises`** | 1. [`src/services/validation.js`](file:///g:/calorie%20meter/src/services/validation.js) (`validateMeal` / `validateExercise`)<br/>2. [`src/services/databaseService.js`](file:///g:/calorie%20meter/src/services/databaseService.js) (`CREATE TABLE`, `ALTER TABLE`, `insert*`, `update*`, `importAllDataJSON`)<br/>3. [`src/stores/useNutritionStore.js`](file:///g:/calorie%20meter/src/stores/useNutritionStore.js) (`dailyTotals` reduction if aggregated)<br/>4. UI forms: [`FoodAnalysisResult.js`](file:///g:/calorie%20meter/src/components/FoodAnalysisResult.js), [`QuickAddModal.js`](file:///g:/calorie%20meter/src/components/QuickAddModal.js), [`MealCard.js`](file:///g:/calorie%20meter/src/components/MealCard.js) |
| **Modifying Gemini prompts, schemas, or models** | [`src/services/geminiService.js`](file:///g:/calorie%20meter/src/services/geminiService.js) (`PRIMARY_MODEL`, `FALLBACK_MODEL`, `analyzeFoodPhoto`, `analyzeNutritionLabel`, `parseMealDescription`, `sendNutritionistChatMessage`) + [`tests/gemini-vision.test.js`](file:///g:/calorie%20meter/tests/gemini-vision.test.js) |
| **Modifying BMR / TDEE / macro target formulas** | [`src/stores/useProfileStore.js`](file:///g:/calorie%20meter/src/stores/useProfileStore.js) (`calculateMetabolism`) + [`src/screens/SettingsScreen.js`](file:///g:/calorie%20meter/src/screens/SettingsScreen.js) + [`tests/core-calculations.test.js`](file:///g:/calorie%20meter/tests/core-calculations.test.js) |
| **Camera capture compression, lifecycle, or laser animation** | [`src/components/CameraScanner.js`](file:///g:/calorie%20meter/src/components/CameraScanner.js), [`src/components/NutritionLabelScanner.js`](file:///g:/calorie%20meter/src/components/NutritionLabelScanner.js), [`src/screens/LogMealScreen.js`](file:///g:/calorie%20meter/src/screens/LogMealScreen.js) (`onCaptureStart`, `scanAnim`, `handleCancelProcessing`) + [`tests/async-forms.test.js`](file:///g:/calorie%20meter/tests/async-forms.test.js) |
| **Fixing barcode lookup or nutriments scaling** | [`src/services/barcodeService.js`](file:///g:/calorie%20meter/src/services/barcodeService.js) (`lookupBarcode`), [`src/services/barcodeNutrition.js`](file:///g:/calorie%20meter/src/services/barcodeNutrition.js) (`productToMeal`), [`src/components/BarcodeScanner.js`](file:///g:/calorie%20meter/src/components/BarcodeScanner.js) |
| **Editing walking formulas or workout presets** | [`src/services/exerciseCalculations.js`](file:///g:/calorie%20meter/src/services/exerciseCalculations.js) (`walkingStats`, `presetCalories`), [`src/components/AddExerciseModal.js`](file:///g:/calorie%20meter/src/components/AddExerciseModal.js), [`src/screens/ActivityScreen.js`](file:///g:/calorie%20meter/src/screens/ActivityScreen.js) |
| **Modifying notification schedules or Android channel** | [`src/services/notificationService.js`](file:///g:/calorie%20meter/src/services/notificationService.js) (`ensureAndroidChannel`, `scheduleDailyReminders`, `sendTestNotification`), [`src/screens/SettingsScreen.js`](file:///g:/calorie%20meter/src/screens/SettingsScreen.js), [`app.json`](file:///g:/calorie%20meter/app.json) |
| **Updating theme colors, typography, or layout shell** | [`src/theme/colors.js`](file:///g:/calorie%20meter/src/theme/colors.js), [`src/App.js`](file:///g:/calorie%20meter/src/App.js) (`mobileShell`), [`src/navigation/TabNavigator.js`](file:///g:/calorie%20meter/src/navigation/TabNavigator.js) |
| **Adding or running automated tests** | [`tests/load-production.cjs`](file:///g:/calorie%20meter/tests/load-production.cjs) (Node VM module loader/mocks), [`tests/async-forms.test.js`](file:///g:/calorie%20meter/tests/async-forms.test.js) (hook simulator), `npm test` |
