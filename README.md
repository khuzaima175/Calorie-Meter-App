# CalorieSnap Pro

A clean, offline-first mobile calorie, macronutrient, and workout tracker built with React Native and Expo.

---

## Overview

CalorieSnap Pro helps you track daily nutrition, hydration, and exercises without bloated interfaces or mandatory cloud accounts. It includes AI-assisted photo recognition, nutrition label scanning, and barcode search, while keeping your personal log stored locally on your device via SQLite.

---

## Core Features

- **Food Logging**:
  - **Photo Recognition**: Take a picture of a meal plate to estimate portion sizes, calories, and macros.
  - **Nutrition Label Scanner**: Extract nutrition tables directly from packaged food labels using OCR.
  - **Barcode Scanner**: Search products instantly via OpenFoodFacts with automatic unit conversions.
  - **Text Parser**: Log meals naturally using plain text descriptions (e.g., "2 scrambled eggs, avocado toast").
  - **Quick Entry**: Fast manual logging for custom meals, calories, and macronutrient targets.

- **Dashboard & Macro Tracking**:
  - Daily calorie ring displaying remaining vs. consumed calories with exercise burn deductions.
  - Earth-tone macronutrient progress breakdown (Protein, Carbohydrates, Fats).
  - Date navigator to review past logs or plan ahead.

- **Hydration Tracking**:
  - Interactive water intake logging with quick +250ml / +500ml increments and daily goal progress.

- **Workout & Activity**:
  - Track exercises (Running, Cycling, HIIT, Strength Training, Swimming, Yoga, etc.) with automatic MET-based calorie burn calculations based on body weight and duration.

- **Nutrition Coach (Sage)**:
  - Context-aware nutritional advice, custom meal plan generator, and daily diet reviews powered by Google Gemini.

- **Metabolism & Profile Calculation**:
  - Automatic BMR (Basal Metabolic Rate) and TDEE (Total Daily Energy Expenditure) calculation using the Mifflin-St Jeor formula to suggest target calorie and macro splits.

---

## Tech Stack

- **Framework**: React Native 0.86, Expo SDK 57
- **State Management**: Zustand
- **Local Storage**: `expo-sqlite` (WAL mode with schema migrations) on mobile; localStorage on web
- **AI Services**: Google Gemini API (`gemini-3.5-flash-lite` primary with `gemini-flash-lite-latest` fallback)
- **Barcode Lookup**: OpenFoodFacts API
- **Date Handling**: `date-fns`

---

## Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Expo Go](https://expo.dev/go) app installed on your iOS or Android phone

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/khuzaima175/Calorie-Meter-App.git
cd Calorie-Meter-App
npm install
```

### 3. Configure API Key

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_GEMINI_KEY=your_gemini_api_key_here
```

> Get a free API key from [Google AI Studio](https://aistudio.google.com/).

### 4. Run the App

Start the development server:

```bash
npx expo start -c
```

- **On Mobile**: Scan the QR code using Expo Go (Android) or the Camera app (iOS).
- **Tunnel Mode** (recommended if PC and phone are on different subnets or behind firewalls):
  ```bash
  npx expo start --tunnel -c
  ```
- **Web Preview**: Press `w` in the terminal or visit `http://localhost:8081`.

---

## Project Structure

```
src/
├── App.js                     # Root component and database bootstrapper
├── theme/
│   └── colors.js              # Theme tokens and color palette
├── stores/
│   ├── useNutritionStore.js   # Meals, water, and exercise state
│   ├── useProfileStore.js     # User profile, goals, and BMR/TDEE calculations
│   └── useAIStore.js          # Chat history, daily reviews, and meal plans
├── services/
│   ├── databaseService.js     # SQLite singleton with schema migrations
│   ├── geminiService.js       # Rate-limited Gemini vision and chat integration
│   └── barcodeService.js      # OpenFoodFacts client with kJ/kcal conversion
├── components/                # Reusable UI components
├── navigation/
│   └── TabNavigator.js        # Bottom navigation bar
└── screens/
    ├── DashboardScreen.js     # Daily overview, calorie ring, and meal categories
    ├── LogMealScreen.js       # 5-tab food logging interface
    ├── ActivityScreen.js      # Workout tracking and active minutes
    ├── AssistantScreen.js     # Sage AI Nutritionist
    └── SettingsScreen.js      # Profile settings, targets, and data management
```

---

## License

This project is open source and available under the [MIT License](LICENSE).
