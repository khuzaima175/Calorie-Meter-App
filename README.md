# CalorieSnap Pro

<div align="center">

![CalorieSnap Pro Banner](assets/icon.png)

**Smart, Offline-First Calorie, Macronutrient, Hydration & Workout Tracker**  
*Powered by React Native, Expo SDK 57, SQLite, and Google Gemini 3.5 Flash-Lite*

[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-Local%20First-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Google Gemini](https://img.shields.io/badge/Gemini-3.5%20Flash--Lite-4285F4?logo=google&logoColor=white)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests: Passing](https://img.shields.io/badge/Tests-11%2F11%20Passing-brightgreen.svg)](tests/core-calculations.test.js)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [1. Multimodal AI Meal Scanner](#1-multimodal-ai-meal-scanner)
  - [2. Nutrition Facts OCR Scanner](#2-nutrition-facts-ocr-scanner)
  - [3. Instant Barcode Scanner](#3-instant-barcode-scanner)
  - [4. Natural Language Meal Parser](#4-natural-language-meal-parser)
  - [5. Dashboard & Macronutrient Balance](#5-dashboard--macronutrient-balance)
  - [6. 7-Day Nutrition Trends & Analytics](#6-7-day-nutrition-trends--analytics)
  - [7. Hydration Tracking with Undo](#7-hydration-tracking-with-undo)
  - [8. MET Workout & Calorie Burn Engine](#8-met-workout--calorie-burn-engine)
  - [9. Sage AI Nutritionist & Meal Planner](#9-sage-ai-nutritionist--meal-planner)
  - [10. Data Backup, Restore & Factory Reset](#10-data-backup-restore--factory-reset)
  - [11. Local Daily Reminders](#11-local-daily-reminders)
  - [12. Complete Accessibility (A11y)](#12-complete-accessibility-a11y)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running the App](#running-the-app)
- [Running Automated Tests](#-running-automated-tests)
- [Project Directory Structure](#-project-directory-structure)
- [Documentation Links](#-documentation-links)
- [License](#-license)

---

## 🌟 Overview

**CalorieSnap Pro** is a modern, privacy-focused health and nutrition tracker designed from the ground up to be **fast, dependable, and completely offline-capable**. Unlike traditional calorie apps that require paid subscriptions, mandatory cloud profiles, or constant internet connectivity, CalorieSnap Pro keeps your personal nutrition and exercise diaries stored securely in a local **SQLite database** on your device.

When online, the app harnesses Google's cutting-edge **Gemini 3.5 Flash-Lite** multimodal AI to analyze food photos, read packaged Nutrition Facts labels, parse spoken or typed meal descriptions, and provide personalized dietary recommendations in sub-second inference time.

---

## ✨ Key Features

### 1. Multimodal AI Meal Scanner
- **Instant Photo Recognition**: Snap a picture of any meal plate to estimate portion weights, calories, and macronutrients.
- **Specialized Cuisine Understanding**: Fine-tuned prompt architecture for Pakistani, South Asian, Mediterranean, and Western dishes (e.g., distinguishing oily curries, whole-wheat rotis, parathas, biryani, daal, and roasted chicken).
- **Multi-Photo Tray**: Capture up to 4 angles of a meal or multi-dish spread in a single scan.
- **Portion Modifiers**: Interactive quick chips (*"Small Plate"*, *"Standard"*, *"Large Serving"*, *"Light Oil"*) and custom text notes for pinpoint accuracy.

### 2. Nutrition Facts OCR Scanner
- **Packaging Label Extraction**: Point the camera at any packaged food label to instantly read the Nutrition Facts table.
- **Full Macro & Micro Breakdown**: Extracts calories, protein, carbs, total fat, dietary fiber, sugars, and sodium directly into your daily log.

### 3. Instant Barcode Scanner
- **OpenFoodFacts Integration**: Real-time barcode scanning with automatic product lookup.
- **Universal Unit Normalization**: Automatic conversion of international energy values (kJ to kcal) and serving-size scaling.
- **Manual Barcode Entry**: Quick numeric keypad entry for barcodes that are difficult to scan.
- **Out-of-Order Discard**: Monotonic request ID counter to prevent slow network responses from overwriting newer scans.

### 4. Natural Language Meal Parser
- **Conversational Entry**: Type meals naturally in English or Roman Urdu (e.g., *"2 rotis with chicken karahi, half cup dahi, and a cucumber salad"*).
- **Instant Ingredient Breakdown**: Gemini AI decomposes complex dishes into individual items and calculates cumulative macros.

### 5. Dashboard & Macronutrient Balance
- **Calorie Balance Ring**: Live visual tracker displaying Target Calories, Food Consumed, Exercise Burn Deductions, and Net Remaining Calories.
- **Earth-Tone Macro Bars**: Dedicated progress bars for Protein, Carbohydrates, and Fats with custom target thresholds.
- **Date Navigation**: Easily jump between dates to view historical logs or log past meals. Forward navigation beyond today is locked to preserve streak integrity.
- **Active Logging Streak**: Real-time consecutive logging streak calculation that persists when logging on consecutive days.

### 6. 7-Day Nutrition Trends & Analytics
- **Weekly Intake Chart**: Interactive 7-day bar chart comparing daily calorie intake against target goals.
- **Surplus & Deficit Insights**: Calculates weekly daily averages and flags calorie surplus or deficit trends.
- **One-Tap Date Selection**: Tap any day on the chart to inspect that specific day's meal logs.

### 7. Hydration Tracking with Undo
- **Quick Logging**: Single-tap hydration increments (+250ml glass, +500ml bottle).
- **Progress Gauge**: Real-time water intake vs. daily hydration goal (default 2,500ml).
- **Instant Undo**: Quick undo button to remove accidental water logs without opening a modal.

### 8. MET Workout & Calorie Burn Engine
- **Accurate Calorie Burn**: Uses the scientific Metabolic Equivalent of Task (MET) formula based on body weight, duration, and activity intensity.
- **Pre-Built & Custom Workouts**: Running, Walking, Cycling, HIIT, Strength Training, Swimming, Yoga, and sports.
- **Active Minutes Tracker**: Aggregates daily cardiovascular and workout minutes on the Dashboard and Activity screens.

### 9. Sage AI Nutritionist & Meal Planner
- **Context-Aware Coaching**: Sage reviews your actual daily consumed calories, macros, profile metrics, and goals to provide actionable advice.
- **Instant Response Time**: Powered by Gemini 3.5 Flash-Lite for sub-second, natural conversation without artificial typing delays.
- **Personalized Meal Planner**: Generates a complete 1-day meal plan matching your exact calorie and macro targets.
- **Daily Diet Review**: Generates a 3-point structured summary covering achievements, areas for improvement, and focus targets for tomorrow.
- **Safe Token Budgeting**: 7,500-token sliding window sanitizer that preserves user-model pairs and prevents context overflow errors.

### 10. Data Backup, Restore & Factory Reset
- **JSON Backup Export**: Export your entire database (meals, exercises, water records, profile metrics, goals) as a structured JSON file.
- **JSON Backup Import**: Restore previous backups with schema-version forward migration.
- **Permanent Image Storage**: Photos are persisted in permanent device storage (`FileSystem.documentDirectory`) on native devices and `IndexedDB` on web to prevent operating-system cache purges.
- **Factory Reset Safeguards**: Complete data wipe option protected by double-confirmation dialogs.

### 11. Local Daily Reminders
- **Smart Scheduling**: 4 daily local notifications via `expo-notifications`:
  - 🌅 **08:30 AM**: Breakfast & Morning Streak
  - 🥗 **01:15 PM**: Lunch Photo & AI Analysis
  - 💧 **04:30 PM**: Hydration Check (+250ml)
  - 🌙 **07:45 PM**: Dinner & Daily Macro Review
- **Privacy First**: Fully local notifications without external push servers or tokens.

### 12. Complete Accessibility (A11y)
- **WCAG AA Compliance**: Full screen reader labels, hints, roles (`button`, `tab`, `switch`), and states (`selected`, `disabled`, `checked`) across every screen and interactive component.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 React Native Presentation Layer              │
│  [Dashboard]   [LogMeal]   [Activity]   [Assistant]   [Settings] │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Zustand State Stores                      │
│   • useNutritionStore     • useProfileStore     • useAIStore │
└──────────────┬───────────────────────┬──────────────────────┘
               │                       │
┌──────────────▼──────────────┐ ┌──────▼──────────────────────┐
│     Persistence Layer       │ │       AI & External APIs     │
│  • SQLite (Native WAL Mode) │ │  • Gemini 3.5 Flash-Lite     │
│  • localStorage (Web Store) │ │  • Gemini Flash-Lite-Latest  │
│  • FileSystem (Permanent)   │ │  • OpenFoodFacts Barcode API │
│  • IndexedDB (Web Images)   │ │  • expo-notifications (Local)│
└─────────────────────────────┘ └─────────────────────────────┘
```

For detailed architectural specifications, database schemas, and data flow diagrams, see [**ARCHITECTURE.md**](file:///g:/Important%20Projects/calorie%20meter/ARCHITECTURE.md).

---

## 🛠️ Tech Stack

| Domain | Technology | Version / Specification |
|---|---|---|
| **Core Framework** | React Native / Expo | React Native 0.86, Expo SDK 57, React 19 |
| **State Management** | Zustand | v5.0 (Lightweight, unopinionated reactive stores) |
| **Local Database** | `expo-sqlite` | SQLite 3 with Write-Ahead Logging (WAL) |
| **Web Persistence** | `localStorage` + `IndexedDB` | Dual-engine storage to prevent 5MB quota errors |
| **Vision & Language AI** | Google Gemini API | `gemini-3.5-flash-lite` (Primary), `gemini-flash-lite-latest` (Fallback) |
| **Camera & Imaging** | `expo-camera`, `expo-image-picker` | Full-bleed viewport, base64 data cleaner, 0.45 JPEG compression |
| **File Storage** | `expo-file-system` | Permanent document storage (`FileSystem.documentDirectory + 'meals/'`) |
| **Barcode Lookup** | OpenFoodFacts REST API | v0 JSON API with unit normalization |
| **Date Calculations** | `date-fns` | ISO date formatting and day calculations |
| **Testing** | Node.js Test Runner | Native `node:test` and `node:assert` |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [Expo Go](https://expo.dev/go) app installed on your iOS or Android device (or an Android/iOS emulator)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/khuzaima175/Calorie-Meter-App.git
cd Calorie-Meter-App

# 2. Install dependencies
npm install
```

### Environment Configuration

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_GEMINI_KEY=your_gemini_api_key_here
```

> **Note**: You can obtain a free Gemini API key from [Google AI Studio](https://aistudio.google.com/). You can also configure or update your API key at any time directly inside the app under **Profile > Settings > Gemini AI Configuration**.

### Running the App

```bash
# Start the Expo development server
npm start

# Or run with Tunnel Mode (recommended for physical devices on different networks)
npx expo start --tunnel -c
```

- **Physical Mobile Device**: Open Expo Go and scan the QR code displayed in the terminal.
- **Web Browser**: Press `w` in the terminal to launch the web version at `http://localhost:8081`.
- **Android Emulator**: Press `a` in the terminal.
- **iOS Simulator**: Press `i` in the terminal (macOS only).

---

## 🧪 Running Automated Tests

CalorieSnap Pro includes a comprehensive unit test suite verifying core mathematical formulas, BMR/TDEE calculations, MET exercise burns, streak tracking algorithms, token estimators, and chat history sanitizers:

```bash
npm test
```

### Test Suite Summary:
- `Mifflin-St Jeor Formula`: Validates BMR and TDEE across gender, age, weight, and activity multipliers.
- `MET Calorie Burn`: Validates calorie expenditure across cardio, strength, and sports intensities.
- `Streak Calculation`: Verifies active consecutive streaks, grace day retention, and streak resets.
- `Chat History Sanitizer`: Validates token budgeting (~4 chars/token) and guarantees proper user-model pair alternation.
- `JSON Cleaner`: Validates robust extraction of JSON payloads from markdown fenced blocks.

---

## 📁 Project Directory Structure

```
Calorie-Meter-App/
├── ARCHITECTURE.md              # Detailed technical design, schemas, and diagrams
├── ISSUES_AND_FEATURES.md       # Bug audit history, root causes, and roadmap
├── README.md                    # Main project documentation
├── package.json                 # Dependencies and npm scripts
├── app.json                     # Expo configuration, permissions, plugins, and splash
├── .env                         # Local environment configuration (API keys)
├── tests/
│   └── core-calculations.test.js # 10 automated unit tests (node:test)
├── assets/                      # Application icons, splash screen, and brand assets
│   ├── icon.png                 # Primary 1024x1024 app icon
│   ├── splash-icon.png          # High-resolution splash screen emblem
│   ├── adaptive-icon.png        # Android adaptive icon with 72dp safe margin
│   ├── favicon.png              # Web browser favicon
│   └── logo.png                 # Brand logo asset
└── src/
    ├── App.js                   # Application root, ErrorBoundary, and SQLite bootstrapper
    ├── theme/
    │   ├── colors.js            # Design tokens, color palette, typography, and radiuses
    ├── stores/
    │   ├── useNutritionStore.js # Meals, water, workouts, and date state
    │   ├── useProfileStore.js   # User physical metrics, goals, and BMR/TDEE math
    │   └── useAIStore.js        # Nutritionist chat history, reviews, and meal plans
    ├── services/
    │   ├── databaseService.js   # SQLite CRUD, migrations, backup JSON export/import
    │   ├── geminiService.js     # Gemini 3.5 Flash-Lite integration, schemas, rate limiter
    │   ├── imageService.js      # Permanent disk storage & Web IndexedDB photo engine
    │   ├── barcodeService.js    # OpenFoodFacts API client with unit conversions
    │   └── notificationService.js # Local 4-times daily meal and water reminder scheduler
    ├── components/              # Modular UI components
    │   ├── CameraScanner.js     # Full-bleed multi-photo camera with portion chips
    │   ├── NutritionLabelScanner.js # Nutrition Facts OCR camera scanner
    │   ├── BarcodeScanner.js    # Barcode viewfinder with torch and manual entry
    │   ├── FoodAnalysisResult.js # Interactive meal confirmation & macro editor card
    │   ├── WeeklyTrendsCard.js  # 7-day calorie vs goal bar chart
    │   ├── QuickAddModal.js     # Fast manual meal entry & edit modal
    │   ├── AddExerciseModal.js  # Workout logger with MET calorie burn calculator
    │   ├── DaySelector.js       # Date navigation header with today locking
    │   ├── CalorieRing.js       # Circular progress ring for remaining calories
    │   ├── MacroBar.js          # Progress bars for Protein, Carbs, and Fats
    │   ├── ErrorBoundary.js     # Top-level error boundary with reload action
    │   ├── OfflineBanner.js     # Network status indicator banner
    │   ├── Button.js            # Animated pressable button with haptics
    │   ├── Input.js             # Form input field with validation
    │   └── Card.js              # Glassmorphic card container
    ├── navigation/
    │   └── TabNavigator.js      # Custom animated 5-tab bottom navigation bar
    └── screens/
        ├── DashboardScreen.js   # Daily overview, calorie ring, macros, trends, water
        ├── LogMealScreen.js     # 5-tab food logging (Photo, Label, Barcode, Text, Manual)
        ├── ActivityScreen.js    # Workout logging, active minutes, and calorie burn
        ├── AssistantScreen.js   # Sage AI Nutritionist chat, reviews, and meal plans
        └── SettingsScreen.js    # Profile metrics, custom goals, notifications, data tools
```

---

## 📚 Documentation Links

- [**ARCHITECTURE.md**](file:///g:/Important%20Projects/calorie%20meter/ARCHITECTURE.md) — Detailed technical architecture, SQLite schemas, mathematical formulas, and system diagrams.
- [**ISSUES_AND_FEATURES.md**](file:///g:/Important%20Projects/calorie%20meter/ISSUES_AND_FEATURES.md) — Comprehensive bug audit log, root cause analyses, solutions applied, and upcoming roadmap.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
