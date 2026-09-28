# CalorieSnap Pro — System Architecture & Technical Design

Comprehensive technical architecture documentation for **CalorieSnap Pro**, an offline-first nutrition, hydration, and workout tracking mobile application built on Expo SDK 57, React Native 0.86, SQLite, and Google Gemini 3.5 Flash-Lite.

---

## 1. System Overview & Architecture Topology

CalorieSnap Pro is designed around an **offline-first, layered architecture** where all core logging, calculation, and retrieval operations occur locally without cloud round-trips. External network calls are isolated to AI multimodal analysis and barcode queries.

```mermaid
graph TD
    subgraph Presentation & UI Layer
        A1[Dashboard Screen]
        A2[Log Meal Screen]
        A3[Activity Screen]
        A4[Assistant Screen]
        A5[Settings Screen]
        A6[TabNavigator & Safe-Area Shell]
        A7[ErrorBoundary & OfflineBanner]
    end

    subgraph State Management Layer (Zustand)
        B1[useNutritionStore<br/>Meals, Water, Workouts, Date]
        B2[useProfileStore<br/>Metrics, Goals, BMR/TDEE]
        B3[useAIStore<br/>Chat History, Reviews, Plans]
    end

    subgraph Service & Persistence Layer
        C1[databaseService<br/>SQLite Native / Web Store]
        C2[imageService<br/>Permanent FileSystem / IndexedDB]
        C3[geminiService<br/>Gemini 3.5 Flash-Lite API]
        C4[barcodeService<br/>OpenFoodFacts Client]
        C5[notificationService<br/>expo-notifications Scheduler]
    end

    subgraph Hardware & Operating System
        D1[Native Camera / CameraView]
        D2[Local FileSystem Document Storage]
        D3[Local SQLite Engine (WAL Mode)]
        D4[Local Push Notification Center]
    end

    subgraph Remote Cloud APIs
        E1[Google Gemini REST API v1beta]
        E2[OpenFoodFacts REST API v0]
    end

    A1 & A2 & A3 & A4 & A5 --> A6
    A6 --> B1 & B2 & B3
    A7 -.-> A6

    B1 <--> C1
    B2 <--> C1
    B1 <--> C2
    B3 <--> C3
    B1 <--> C4
    A5 <--> C5

    C1 <--> D3
    C2 <--> D2
    C3 <--> E1
    C4 <--> E2
    C5 <--> D4
    A2 <--> D1
```

---

## 2. Core Architectural Principles

1. **Local Sovereignty & Offline-First Persistence**:
   - Every meal, workout, hydration entry, and user target is committed directly to an ACID-compliant local **SQLite** database on the device.
   - The application functions seamlessly without an active internet connection. Network access is utilized exclusively for optional multimodal AI features and barcode product searches.

2. **Sub-Second Multimodal AI Vision**:
   - Primary AI model: **`gemini-3.5-flash-lite`** (~1,100ms average round-trip latency).
   - Secondary fallback model: **`gemini-flash-lite-latest`** (automatic fallback on model unavailability or transient quota spikes).
   - Strict JSON structured output mode enforced via `responseMimeType: 'application/json'` and `generationConfig.responseSchema`.

3. **Permanent Media & Cache Purge Protection**:
   - Operating system camera and image picker utilities output files to temporary cache directories that mobile OSes purge under storage pressure.
   - `imageService` copies temporary image files into permanent application storage (`FileSystem.documentDirectory + 'meals/'`) or browser `IndexedDB` before writing references to SQLite.

4. **Guaranteed State Consistency & Concurrency Protection**:
   - **Double-Tap Locks**: Action buttons enforce `isSaving` state locks with strict `try / catch / finally` execution guarantees.
   - **Monotonic Request Ordering**: Barcode queries utilize a monotonic request ID counter (`barcodeReqIdRef`) to discard out-of-order responses from slow network connections.
   - **Boundary Validation**: Numerical inputs enforce strict clinical boundaries ($1 \le \text{calories} \le 10,000$, $0 \le \text{macros} \le 1,000$, $1 \le \text{duration} \le 720\text{ mins}$).

5. **Universal WCAG AA Accessibility (A11y)**:
   - Full accessibility props (`accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, `accessibilityState`) across all buttons, tabs, chips, modals, inputs, and charts.

---

## 3. Presentation Layer & Viewport Architecture

### 1. Safe-Area & Inset Clamp Architecture
- **Zero-Inset Race Condition Prevention**: On initial Android boot, `useSafeAreaInsets` often evaluates to `{ top: 0, bottom: 0 }` during the first layout pass before window metrics resolve. To eliminate bottom bar flicker and clipping on Android 3-button navigation bars and iOS Home Indicators, the root tree is initialized with:
  ```javascript
  <SafeAreaProvider initialMetrics={initialWindowMetrics}>
  ```
- **Dynamic Inset Clamping**: The bottom tab navigation bar in [`TabNavigator.js`](file:///g:/Important%20Projects/calorie%20meter/src/navigation/TabNavigator.js) enforces a defensive clamp:
  ```javascript
  paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8)
  ```
  This guarantees that even on devices where the system reports `insets.bottom = 0`, the tab bar always maintains at least 16dp of breathing room above hardware or gesture bars.

### 2. Docked 5-Slot Bottom Navigation Bar Architecture
- **Symmetric Layout**: 5 slots distributed as:
  1. `Dashboard` (Home overview, daily calorie ring, macro bars, water gauge)
  2. `Activity` (MET workout logs, exercise active minutes)
  3. `Camera Shutter` (Elevated center button with animated micro-scale spring feedback)
  4. `Assistant` (Sage AI nutritionist chat, daily diet review, meal planner)
  5. `Settings` (Profile metrics, BMR/TDEE targets, notifications, JSON backup/restore)
- **Decoupled Full-Screen Camera Mode**:
  - When the user presses the center camera button or navigates to `LogMealScreen`, the app activates `isCameraMode`.
  - In `isCameraMode`, the screen switches to a dedicated full-screen overlay that replaces the bottom navigation bar with a dedicated camera control bar (system camera launcher, gallery picker, camera lens flip, and live multi-photo capture tray) alongside a floating top-left close button (`X`), preventing navigation bar collisions.

### 3. Android SurfaceView Hardware Layering & Full-Bleed Rendering
In Android's graphics pipeline, React Native's `CameraView` uses a native `SurfaceView`/`TextureView` that renders on a dedicated hardware layer behind the application view tree:
- **The Black Viewport Problem**: If parent containers have opaque background colors (e.g., `#000000` or `#121214`), React Native's Android `ViewGroup` renders an opaque box over the hardware surface hole, obscuring the camera feed everywhere except behind the translucent system status bar.
- **Architectural Solution**: Container wrappers in [`LogMealScreen.js`](file:///g:/Important%20Projects/calorie%20meter/src/screens/LogMealScreen.js), [`CameraScanner.js`](file:///g:/Important%20Projects/calorie%20meter/src/components/CameraScanner.js), and [`NutritionLabelScanner.js`](file:///g:/Important%20Projects/calorie%20meter/src/components/NutritionLabelScanner.js) enforce `backgroundColor: 'transparent'` and `...StyleSheet.absoluteFillObject` coordinates, allowing the camera hardware surface to render full-bleed across 100% of the screen.

---

## 4. Storage & Database Schema Architecture

### SQLite Relational Database (`caloriesnap.db`)

On native platforms (iOS/Android), the database runs SQLite 3 with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and foreign key constraints enabled.

```sql
-- 1. Meals Table (Food intake, macronutrients, and media references)
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                  -- Format: YYYY-MM-DD
  timestamp TEXT NOT NULL,             -- ISO 8601 string
  meal_type TEXT NOT NULL,             -- breakfast | lunch | dinner | snack
  name TEXT NOT NULL,
  calories REAL NOT NULL,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  fiber REAL NOT NULL DEFAULT 0,
  sugar REAL NOT NULL DEFAULT 0,
  sodium REAL NOT NULL DEFAULT 0,
  portion TEXT DEFAULT '1 serving',
  image_uri TEXT                       -- Permanent local file path or IndexedDB key
);

-- 2. Exercises Table (Physical workouts and active burn)
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  duration_minutes REAL NOT NULL,
  calories_burned REAL NOT NULL,
  intensity TEXT DEFAULT 'moderate',   -- low | moderate | high
  category TEXT DEFAULT 'cardio'       -- cardio | strength | flexibility | sports
);

-- 3. Water Intake Table (Hydration logs)
CREATE TABLE IF NOT EXISTS water_intake (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  amount_ml REAL NOT NULL
);

-- 4. Goals Singleton Table (id = 1)
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY DEFAULT 1,
  calories REAL NOT NULL DEFAULT 2000,
  protein REAL NOT NULL DEFAULT 140,
  carbs REAL NOT NULL DEFAULT 220,
  fat REAL NOT NULL DEFAULT 65,
  water_ml REAL NOT NULL DEFAULT 2500,
  exercise_minutes REAL NOT NULL DEFAULT 30
);

-- 5. Profile Singleton Table (id = 1)
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT 'Explorer',
  gender TEXT DEFAULT 'male',
  age INTEGER DEFAULT 26,
  weight_kg REAL DEFAULT 75,
  height_cm REAL DEFAULT 178,
  activity_level TEXT DEFAULT 'moderate',
  goal_type TEXT DEFAULT 'lose_weight',
  custom_api_key TEXT DEFAULT ''       -- Optional user-configured Gemini API key
);

-- Date-Partitioned Performance Indices
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
CREATE INDEX IF NOT EXISTS idx_exercises_date ON exercises(date);
CREATE INDEX IF NOT EXISTS idx_water_date ON water_intake(date);
```

### Schema Migration Engine
The database uses `PRAGMA user_version` to handle schema migrations progressively without data loss:
- **Version 1**: Initial baseline tables (`meals`, `exercises`, `water_intake`, `goals`, `profile`).
- **Version 2**: Added micronutrient columns (`fiber`, `sugar`, `sodium`) to `meals` and `custom_api_key` to `profile`.

### Dual-Engine Web Storage Architecture
When executed in a web browser (`Platform.OS === 'web'`):
1. **Metadata & Relational Records**: Serialized to browser `localStorage` under `CALORIESNAP_WEB_STORE_V2`. Large base64 strings are stripped to prevent exceeding the browser's 5MB `localStorage` limit.
2. **Binary Image Storage**: Stored in browser **IndexedDB** (`CalorieSnapImagesDB`) with a 10MB quota safety guard.

---

## 5. State Management Architecture (Zustand)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          useNutritionStore                             │
│  State: selectedDate, meals[], exercises[], waterIntake[], dailyTotals │
│  Actions: setSelectedDate, addMeal, editMeal, removeMeal,              │
│           logWater, undoWater, addExercise, removeExercise             │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│                           useProfileStore                              │
│  State: profile, goals, calculatedBmr, calculatedTdee                  │
│  Actions: loadProfile, saveProfile, saveGoals, calculateMetabolism     │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│                              useAIStore                                │
│  State: messages[], isGenerating, error, lastReview, mealPlan          │
│  Actions: sendUserMessage, requestDailyReview, requestMealPlan,        │
│           clearChat                                                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Multimodal Vision & Language AI Pipeline

### Pipeline Data Flow

```
[User Camera / Gallery] 
       │
       ▼
[Image Preprocessing: JPEG 0.45 Quality, max 1024px] 
       │
       ▼
[cleanBase64 Stripper: Remove 'data:image/...;base64,' prefix]
       │
       ▼
[Context Injection: Time of Day, Meal Period, User Portion Notes, Targets]
       │
       ▼
[RateLimiter: 60 RPM (Custom Key) / 15 RPM (Shared Key)]
       │
       ▼
[Primary Model: gemini-3.5-flash-lite with responseSchema]
       ├── (200 OK) ────────► [JSON Validator & Parser] ──► [UI Confirmation]
       └── (404/503/Error) ──► [Fallback: gemini-flash-lite-latest] ──► [UI]
```

### Structured Output Schemas

Gemini REST API calls enforce strict schema adherence via `generationConfig.responseSchema`:

```javascript
export const FOOD_ANALYSIS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    meal_type: { type: 'STRING' },
    portion: { type: 'STRING' },
    calories: { type: 'NUMBER' },
    protein: { type: 'NUMBER' },
    carbs: { type: 'NUMBER' },
    fat: { type: 'NUMBER' },
    fiber: { type: 'NUMBER' },
    sugar: { type: 'NUMBER' },
    sodium: { type: 'NUMBER' },
    confidence: { type: 'NUMBER' },
  },
  required: ['name', 'meal_type', 'portion', 'calories', 'protein', 'carbs', 'fat'],
};
```

### Chat History Sanitization & Token Budgeting
To prevent HTTP 400 `INVALID_ARGUMENT` context overflows during long chat sessions:
1. `estimateTokens(str)` approximates tokens at **~4 characters per token**.
2. `sanitizeChatHistory(history, newTurnText, maxTokenBudget = 7500)`:
   - Iterates backwards from the most recent turn.
   - Preserves complete `[user -> model]` conversational pairs.
   - Prunes leading orphaned model turns.
   - Enforces strict role alternation.

---

## 7. Mathematical Formulations & Algorithms

### 1. Mifflin-St Jeor BMR Equation
$$\text{BMR}_{\text{male}} = 10 \times \text{weight (kg)} + 6.25 \times \text{height (cm)} - 5 \times \text{age (yrs)} + 5$$
$$\text{BMR}_{\text{female}} = 10 \times \text{weight (kg)} + 6.25 \times \text{height (cm)} - 5 \times \text{age (yrs)} - 161$$

### 2. Total Daily Energy Expenditure (TDEE)
$$\text{TDEE} = \text{BMR} \times \text{Activity Multiplier}$$

| Activity Level | Multiplier | Description |
|---|---|---|
| **Sedentary** | `1.200` | Little or no exercise, desk job |
| **Lightly Active** | `1.375` | Light exercise 1–3 days/week |
| **Moderately Active** | `1.550` | Moderate exercise 3–5 days/week |
| **Very Active** | `1.725` | Heavy exercise 6–7 days/week |
| **Extremely Active** | `1.900` | Physical labor or intense athlete training |

### 3. Goal Adjustment & Macronutrient Distribution

| Goal Type | Calorie Adjustment | Protein Ratio | Carb Ratio | Fat Ratio |
|---|---|---|---|---|
| **Lose Weight** | $\text{TDEE} - 500\text{ kcal}$ | $30\%$ of kcal ($4\text{ kcal/g}$) | $40\%$ of kcal ($4\text{ kcal/g}$) | $30\%$ of kcal ($9\text{ kcal/g}$) |
| **Maintain Weight**| $\text{TDEE} \pm 0\text{ kcal}$ | $25\%$ of kcal ($4\text{ kcal/g}$) | $50\%$ of kcal ($4\text{ kcal/g}$) | $25\%$ of kcal ($9\text{ kcal/g}$) |
| **Build Muscle** | $\text{TDEE} + 350\text{ kcal}$ | $30\%$ of kcal ($4\text{ kcal/g}$) | $45\%$ of kcal ($4\text{ kcal/g}$) | $25\%$ of kcal ($9\text{ kcal/g}$) |

### 4. Exercise Calorie Burn (MET Formula)
$$\text{Calories Burned} = \left(\frac{\text{MET} \times 3.5 \times \text{Weight (kg)}}{200}\right) \times \text{Duration (mins)}$$

### 5. Active Logging Streak Algorithm
- Given a set of unique logged dates $\{D_1, D_2, \dots, D_n\}$:
  - If $D_{\text{today}} \in \text{Dates}$, streak begins at $1$ and evaluates prior consecutive days $D_{\text{today}-1}, D_{\text{today}-2}, \dots$
  - If $D_{\text{today}} \notin \text{Dates}$, but $D_{\text{yesterday}} \in \text{Dates}$, streak is preserved at $1 + \dots$ (grace period for current day).
  - If neither today nor yesterday has entries, streak resets to $0$.

---

## 8. Local Notification Engine (`notificationService.js`)

Uses `expo-notifications` for fully local, privacy-preserving notification scheduling without external push infrastructure:

| Time | Title | Body |
|---|---|---|
| **08:30 AM** | 🌅 Breakfast Time! | Log your breakfast to kickstart your day and maintain your active streak. |
| **01:15 PM** | 🥗 Lunch Photo Reminder | Snap a photo of your lunch for instant portion and macro analysis. |
| **04:30 PM** | 💧 Hydration Check | Time for a glass of water (+250ml) to hit your daily hydration target. |
| **07:45 PM** | 🌙 Dinner & Daily Review | Log your dinner and check your daily macro balance with Sage AI. |

---

## 9. Error Handling & Recovery Architecture

```
┌───────────────────────────────────────────────────────────┐
│                     ErrorBoundary.js                      │
│  Catches render errors, component crashes, missing props. │
│  Renders recovery screen with a "Reload Screen" action.   │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                     OfflineBanner.js                      │
│  Monitors network status. Informs user that logging       │
│  persists locally in SQLite while offline.                │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│               parseAndFormatGeminiError.js                │
│  Parses HTTP 400, 429, 503, and network errors into       │
│  clear, actionable user feedback.                         │
└───────────────────────────────────────────────────────────┘
```
