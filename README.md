# CalorieSnap Pro

A local-first calorie, macronutrient, hydration, and workout tracker for mobile and web. Built with React Native, Expo SDK 57, SQLite, and Google Gemini.

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture & Design](#architecture--design)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

CalorieSnap Pro is designed for fast, dependable daily logging without subscriptions or mandatory cloud accounts. All logs remain on your device in SQLite. 

The app includes multimodal meal scanning with Gemini 3.5 Flash-Lite, Nutrition Facts label OCR, OpenFoodFacts barcode lookup, natural language meal input, and an interactive assistant for nutrition and meal planning.

---

## Features

### Food & Nutrition Logging
- **Photo Recognition**: Analyze meal photos to estimate portion sizes, calories, and macronutrients (supports Pakistani, South Asian, and global dishes).
- **Nutrition Facts OCR**: Scan food packaging tables to read calories, protein, carbs, fat, fiber, sugar, and sodium.
- **Barcode Lookup**: Live barcode scanner powered by OpenFoodFacts with automatic unit conversions.
- **Natural Language Parsing**: Describe meals in English or Roman Urdu (e.g., *"2 rotis with chicken karahi and salad"*) to calculate nutritional values.
- **Quick Logging & Editing**: Fast manual entry and full editing for logged meals with range validation.

### Dashboard & Analytics
- **Calorie Tracker**: Visual remaining vs. consumed calorie balance with workout deductions.
- **Macro Tracking**: Protein, carbohydrate, and fat progress bars against customized targets.
- **7-Day Trends**: Weekly intake chart with daily averages and surplus/deficit summaries.
- **Date Navigation**: View and log entries for past days with forward-navigation lock to preserve streak accuracy.

### Hydration & Workouts
- **Water Logging**: Quick +250ml / +500ml intake logging with single-tap undo.
- **Exercise Tracker**: Log cardio, strength training, and sports with MET-based calorie burn calculations based on body weight and duration.

### Nutrition Coach & Meal Planning
- **Contextual Nutrition Assistant**: Ask questions and receive guidance based on your daily consumed macros and goals.
- **Custom Meal Planner**: Generate 1-day meal plans matching specific calorie and macronutrient targets.
- **Daily Review**: 3-point summary of daily achievements, improvements, and targets for tomorrow.

### Storage & Reliability
- **Permanent Image Storage**: Stores photos in permanent document storage on mobile (`FileSystem.documentDirectory`) and IndexedDB on web to avoid OS cache deletion.
- **Backup & Restore**: Export and import full database backups in JSON format with schema version migration.
- **Factory Reset**: Clear all logs and restore default settings with confirmation safeguards.
- **Offline Support**: Local SQLite persistence with network status awareness.

---

## Architecture & Design

CalorieSnap Pro uses an offline-first architecture with local SQLite storage on native platforms and IndexedDB on web browsers.

- Detailed technical architecture and system diagrams: [**ARCHITECTURE.md**](file:///g:/Important%20Projects/calorie%20meter/ARCHITECTURE.md)
- Bug audit history, solutions, and roadmap: [**ISSUES_AND_FEATURES.md**](file:///g:/Important%20Projects/calorie%20meter/ISSUES_AND_FEATURES.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.86, Expo SDK 57, React 19 |
| State Management | Zustand 5 |
| Local Database | `expo-sqlite` (Native WAL mode) / `localStorage` + `IndexedDB` (Web) |
| Vision & Language | Google Gemini API (`gemini-3.5-flash-lite` primary, `gemini-flash-lite-latest` fallback) |
| Camera & Media | `expo-camera`, `expo-image-picker`, `expo-file-system` |
| Product Database | OpenFoodFacts API |
| Date Utilities | `date-fns` |
| Testing | Node.js Test Runner (`node:test`, `node:assert`) |

---

## Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- Expo Go app on iOS or Android (or a web browser)

### 2. Installation
```bash
git clone https://github.com/khuzaima175/Calorie-Meter-App.git
cd Calorie-Meter-App
npm install
```

### 3. Environment Configuration
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_GEMINI_KEY=your_gemini_api_key_here
```
> You can also configure or change your API key inside the app under **Profile > Settings > Gemini AI Configuration**.

### 4. Start Development Server
```bash
# Start the Expo development server
npm start

# Or with Tunnel Mode (recommended for physical device testing over different networks)
npx expo start --tunnel -c
```

- **Mobile**: Scan the terminal QR code using Expo Go (Android) or the Camera app (iOS).
- **Web**: Press `w` in the terminal to open the web build at `http://localhost:8081`.

---

## Running Tests

The test suite covers the Mifflin-St Jeor formula, MET exercise calculations, streak tracking logic, and chat token sanitization:

```bash
npm test
```

---

## Project Structure

```
Calorie-Meter-App/
├── ARCHITECTURE.md              # Technical design, schemas, and diagrams
├── ISSUES_AND_FEATURES.md       # Bug tracker, root causes, and roadmap
├── README.md                    # Project documentation
├── package.json                 # Dependencies and scripts
├── tests/
│   └── core-calculations.test.js # Unit test suite
└── src/
    ├── App.js                   # Application root and database initialization
    ├── theme/
    │   └── colors.js            # Design tokens, typography, and color palette
    ├── stores/
    │   ├── useNutritionStore.js # Meals, water, and exercise state
    │   ├── useProfileStore.js   # User profile, goals, and BMR/TDEE math
    │   └── useAIStore.js        # Chat, daily reviews, and meal plans
    ├── services/
    │   ├── databaseService.js   # SQLite CRUD, migrations, backup export/import
    │   ├── geminiService.js     # Gemini API integration with structured schemas
    │   ├── imageService.js      # Filesystem & IndexedDB image storage
    │   └── barcodeService.js    # OpenFoodFacts lookup client
    ├── components/              # UI components (charts, modals, inputs, camera)
    ├── navigation/
    │   └── TabNavigator.js      # 5-tab navigation bar
    └── screens/
        ├── DashboardScreen.js   # Today's overview, calorie ring, macros, trends
        ├── LogMealScreen.js     # 5-tab food intake logging interface
        ├── ActivityScreen.js    # Workout logging and active minutes
        ├── AssistantScreen.js   # Nutrition assistant chat and meal planner
        └── SettingsScreen.js    # Profile metrics, targets, and data tools
```

---

## Documentation

- [ARCHITECTURE.md](file:///g:/Important%20Projects/calorie%20meter/ARCHITECTURE.md) — System architecture, storage layers, and API schemas.
- [ISSUES_AND_FEATURES.md](file:///g:/Important%20Projects/calorie%20meter/ISSUES_AND_FEATURES.md) — Bug audit log, solutions, and roadmap.

---

## License

This project is licensed under the [MIT License](LICENSE).
