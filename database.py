import sqlite3
import datetime

class DatabaseManager:
    def __init__(self, db_path="calorie_tracker.db"):
        self.db_path = db_path
        self.init_database()

    def calculate_streak(self):
        """Calculates the current streak of consecutive days with logged meals."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        # Get all unique dates with meals, sorted descending
        cursor.execute('SELECT DISTINCT date FROM meals ORDER BY date DESC')
        dates = [row[0] for row in cursor.fetchall()]
        conn.close()

        if not dates:
            return 0

        streak = 0
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        yesterday = (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")

        # Check if the most recent log is today or yesterday (streak filters active)
        if dates[0] == today:
            streak = 1
            current_check = yesterday
        elif dates[0] == yesterday:
            streak = 1
            current_check = (datetime.datetime.now() - datetime.timedelta(days=2)).strftime("%Y-%m-%d")
        else:
            return 0 # Streak broken if not logged today or yesterday

        # Check backwards
        # We need to find consecutive dates.
        # Efficient way: parse dates and check difference.
        
        # Re-evaluating: simpler loop logic
        # 1. Start from 'today' (optional) or 'yesterday'
        # 2. Check if date exists in 'dates' list
        # 3. If yes, increment, move back 1 day. If no, stop.
        
        streak = 0
        
        # If logged today, streak starts at 1, check yesterday...
        # If not logged today but logged yesterday, streak starts at 1, check day before...
        # If neither, streak is 0.
        
        check_date = datetime.datetime.now()
        check_str = check_date.strftime("%Y-%m-%d")
        
        # If not logged today, check if yesterday was logged to salvage streak
        if check_str not in dates:
             check_date = check_date - datetime.timedelta(days=1)
             check_str = check_date.strftime("%Y-%m-%d")
             if check_str not in dates:
                 return 0
        
        # Now count backwards
        while check_str in dates:
            streak += 1
            check_date = check_date - datetime.timedelta(days=1)
            check_str = check_date.strftime("%Y-%m-%d")
            
        return streak

    def init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS meals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                food_description TEXT NOT NULL,
                calories REAL NOT NULL,
                protein REAL NOT NULL,
                fat REAL NOT NULL,
                carbs REAL NOT NULL,
                fiber REAL DEFAULT 0,
                sugar REAL DEFAULT 0,
                sodium REAL DEFAULT 0,
                meal_type TEXT DEFAULT 'snack'
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS daily_goals (
                date TEXT PRIMARY KEY,
                calories REAL NOT NULL,
                protein REAL NOT NULL,
                fat REAL NOT NULL,
                carbs REAL NOT NULL,
                water_ml REAL DEFAULT 2000,
                exercise_minutes REAL DEFAULT 30
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                exercise_name TEXT NOT NULL,
                duration_minutes REAL NOT NULL,
                calories_burned REAL NOT NULL,
                intensity TEXT DEFAULT 'moderate'
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS water_intake (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                amount_ml REAL NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS favorite_foods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                calories_per_serving REAL NOT NULL,
                protein_per_serving REAL NOT NULL,
                fat_per_serving REAL NOT NULL,
                carbs_per_serving REAL NOT NULL,
                serving_size TEXT NOT NULL,
                added_date TEXT NOT NULL
            )
        ''')
        conn.commit()
        conn.close()

    def save_meal(self, date, timestamp, food_description, nutrition_data, meal_type='snack'):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        foods = nutrition_data.get('foods', [])
        if not isinstance(foods, list):
            foods = [foods]
        for food in foods:
            if not isinstance(food, dict): continue
            cursor.execute('''
                INSERT INTO meals (date, timestamp, food_description, calories, protein, fat, carbs, fiber, sugar, sodium, meal_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                date, timestamp, food.get('name', food_description),
                food.get('calories', 0), food.get('protein_g', 0), food.get('fat_g', 0), food.get('carbs_g', 0),
                food.get('fiber_g', 0), food.get('sugar_g', 0), food.get('sodium_mg', 0), meal_type
            ))
        conn.commit()
        conn.close()

    def get_meals_by_date(self, date):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM meals WHERE date = ? ORDER BY timestamp', (date,))
        meals = cursor.fetchall()
        conn.close()
        return meals

    def delete_meal(self, meal_id):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM meals WHERE id = ?', (meal_id,))
        conn.commit()
        conn.close()

    def get_date_range_stats(self, start_date, end_date):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT date, SUM(calories), SUM(protein), SUM(fat), SUM(carbs)
            FROM meals 
            WHERE date BETWEEN ? AND ?
            GROUP BY date
            ORDER BY date
        ''', (start_date, end_date))
        stats = cursor.fetchall()
        conn.close()
        return stats

    def save_exercise(self, date, timestamp, exercise_name, duration_minutes, calories_burned, intensity='moderate'):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO exercises (date, timestamp, exercise_name, duration_minutes, calories_burned, intensity)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (date, timestamp, exercise_name, duration_minutes, calories_burned, intensity))
        conn.commit()
        conn.close()

    def get_exercises_by_date(self, date):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM exercises WHERE date = ? ORDER BY timestamp', (date,))
        exercises = cursor.fetchall()
        conn.close()
        return exercises

    def delete_exercise(self, exercise_id):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM exercises WHERE id = ?', (exercise_id,))
        conn.commit()
        conn.close()

    def save_water_intake(self, date, timestamp, amount_ml):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO water_intake (date, timestamp, amount_ml)
            VALUES (?, ?, ?)
        ''', (date, timestamp, amount_ml))
        conn.commit()
        conn.close()

    def get_water_intake_by_date(self, date):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT SUM(amount_ml) FROM water_intake WHERE date = ?', (date,))
        result = cursor.fetchone()
        conn.close()
        return result[0] if result[0] else 0
