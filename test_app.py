
import unittest
import os
import sys
import sqlite3
import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DatabaseManager

class TestDatabase(unittest.TestCase):
    def setUp(self):
        self.db_name = "test_calorie_tracker.db"
        self.db = DatabaseManager(self.db_name)

    def tearDown(self):
        import time
        time.sleep(0.1) # Release handle
        if os.path.exists(self.db_name):
            try:
                os.remove(self.db_name)
            except PermissionError:
                pass 

    def test_meal_save_and_retrieve(self):
        date = "2023-01-01"
        self.db.save_meal(date, "12:00", "Test Apple", {"foods": [{"name": "Test Apple", "calories": 50}]}, "snack")
        meals = self.db.get_meals_by_date(date)
        self.assertEqual(len(meals), 1)
        self.assertEqual(meals[0][3], "Test Apple")
        self.assertEqual(meals[0][4], 50)

    def test_calculate_streak(self):
        # Clear meals for clean test
        conn = sqlite3.connect("test_calorie_tracker.db")
        cursor = conn.cursor()
        cursor.execute("DELETE FROM meals")
        conn.commit()
        conn.close()

        # 0 streak
        self.assertEqual(self.db.calculate_streak(), 0)

        # 1 day streak (today)
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        dummy_data = {"foods": [{"name": "Test", "calories": 100}]}
        self.db.save_meal(today, "12:00", "Meal 1", dummy_data, "snack")
        self.assertEqual(self.db.calculate_streak(), 1)

        # 2 day streak (yesterday + today)
        yesterday = (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        self.db.save_meal(yesterday, "12:00", "Meal 2", dummy_data, "snack")
        self.assertEqual(self.db.calculate_streak(), 2)

        # Remove today to check "logged yesterday but not today" scenario
        conn = sqlite3.connect("test_calorie_tracker.db")
        cursor = conn.cursor()
        cursor.execute("DELETE FROM meals WHERE date=?", (today,))
        conn.commit()
        conn.close()
        
        self.assertEqual(self.db.calculate_streak(), 1)


if __name__ == '__main__':
    unittest.main()
