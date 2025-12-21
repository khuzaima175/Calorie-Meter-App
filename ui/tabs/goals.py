
import customtkinter
from tkinter import messagebox

class GoalsTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self.setup_ui()

    def setup_ui(self):
        goals_frame = customtkinter.CTkFrame(self.tab)
        goals_frame.pack(padx=20, pady=20, fill="both", expand=True)
        
        customtkinter.CTkLabel(goals_frame, text="Set Your Daily Goals", font=customtkinter.CTkFont(size=18, weight="bold")).grid(row=0, column=0, columnspan=2, pady=20)
        
        labels = ["Calories (kcal):", "Protein (g):", "Fat (g):", "Carbs (g):", "Water (ml):", "Exercise (min):"]
        self.entries = {}
        
        key_map = [
            ("target_calories", self.app.target_calories),
            ("target_protein", self.app.target_protein),
            ("target_fat", self.app.target_fat),
            ("target_carbs", self.app.target_carbs),
            ("target_water", self.app.target_water),
            ("target_exercise", self.app.target_exercise)
        ]

        for i, label_text in enumerate(labels):
            customtkinter.CTkLabel(goals_frame, text=label_text).grid(row=i + 1, column=0, padx=20, pady=10, sticky="e")
            entry = customtkinter.CTkEntry(goals_frame, placeholder_text=str(int(key_map[i][1])))
            entry.grid(row=i + 1, column=1, padx=20, pady=10)
            self.entries[key_map[i][0]] = entry

        customtkinter.CTkLabel(goals_frame, text="Dietary Restrictions:").grid(row=7, column=0, padx=20, pady=10, sticky="e")
        self.diet_restrict_entry = customtkinter.CTkEntry(goals_frame, placeholder_text="e.g., Vegetarian, Gluten-Free")
        self.diet_restrict_entry.grid(row=7, column=1, padx=20, pady=10)

        customtkinter.CTkLabel(goals_frame, text="Food Preferences/Dislikes:").grid(row=8, column=0, padx=20, pady=10, sticky="e")
        self.food_pref_entry = customtkinter.CTkEntry(goals_frame, placeholder_text="e.g., No seafood, Likes spicy")
        self.food_pref_entry.grid(row=8, column=1, padx=20, pady=10)

        self.update_goals_button = customtkinter.CTkButton(goals_frame, text="Update Goals", command=self.update_goals)
        self.update_goals_button.grid(row=9, column=0, columnspan=2, pady=30)

    def update_goals(self):
        try:
            self.app.target_calories = float(self.entries["target_calories"].get() or self.app.target_calories)
            self.app.target_protein = float(self.entries["target_protein"].get() or self.app.target_protein)
            self.app.target_fat = float(self.entries["target_fat"].get() or self.app.target_fat)
            self.app.target_carbs = float(self.entries["target_carbs"].get() or self.app.target_carbs)
            self.app.target_water = float(self.entries["target_water"].get() or self.app.target_water)
            self.app.target_exercise = float(self.entries["target_exercise"].get() or self.app.target_exercise)

            self.app.dietary_restrictions = self.diet_restrict_entry.get()
            self.app.food_preferences = self.food_pref_entry.get()

            messagebox.showinfo("Success", "Goals updated successfully!")
            self.app.refresh_data()
        except ValueError:
            messagebox.showerror("Input Error", "Please enter valid numbers for all goals.")
