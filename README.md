# Calorie Meter Pro - AI-Powered Nutrition Tracker

A modern, python-based desktop application for tracking calories, nutrition, and fitness goals, supercharged with Gemini AI.

## Features

- **🥑 Smart Food Logging**: 
  - Add food by typing natural descriptions (e.g., "2 eggs and toast").
  - **📸 Photo Analysis**: Upload a picture of your meal, and the AI will estimate calories and macros.
- **📊 Interactive Dashboard**:
  - Live charts for calorie types, macronutrient breakdown, and weekly trends.
  - "Quick Stats" sidebar for at-a-glance progress.
- **🤖 AI Nutrition Assistant**:
  - **Nutrition QA**: Ask any diet or health question.
  - **Meal Planner**: Get personalized daily meal plans based on your goals.
  - **Motivational Coach**: Get daily AI-generated motivation based on your streak and progress.
- **💧 Water & Exercise Tracking**: dedicated tabs for hydration and workout logging.
- **📈 History & Goals**: Review past logs and set customized calorie/macro targets.
- **🔥 Streak Tracking & Quick Add**: Keep track of consecutive logging days and use one-click chips for common foods.
- **📊 Data Export**: Easily export your daily nutrition and exercise logs to CSV format.
- **⌨️ Keyboard Navigation**: Swiftly move between dates using `<Control-Left>` and `<Control-Right>`.
- **🌑 Modern UI**: Built with CustomTkinter, featuring live Theme switching (Light/Dark mode) and smooth animations.

## Tech Stack

- **Python 3.10+** (Core Logic)
- **CustomTkinter** (Modern UI Framework)
- **Google Gemini API** (AI Analysis & Chat)
- **SQLite** (Local Database)
- **Matplotlib** (Data Visualization)

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/khuzaima175/Calorie-Meter-App.git
   cd Calorie-Meter-App
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up API Key**:
   - Get your free API key from [Google AI Studio](https://aistudio.google.com/).
   - Create a `.env` file in the root directory:
     ```env
     GEMINI_API_KEY=your_api_key_here
     ```

## Usage

Run the main application:

```bash
python main.py
```

- **First Launch**: The app will create a local database (`calorie_tracker.db`) automatically.
- **Navigation**: Use the sidebar to switch between Daily Log, Charts, AI Analysis, and more.

## Development

- `main.py`: Entry point.
- `ui/`: Contains all UI code and tab modules.
- `ai_manager.py`: Handles interactions with Google Gemini.
- `database.py`: Manages SQLite storage for meals and exercises.

## License

This project is open-source. Feel free to fork and improve!
