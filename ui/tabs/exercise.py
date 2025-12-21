
import customtkinter
from tkinter import messagebox
import datetime

class ExerciseTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(1, weight=1)
        self.tab.grid_rowconfigure(1, weight=1)
        
        add_frame = customtkinter.CTkFrame(self.tab)
        add_frame.grid(row=0, column=0, rowspan=2, padx=10, pady=10, sticky="ns")
        
        customtkinter.CTkLabel(add_frame, text="Log New Exercise", font=customtkinter.CTkFont(size=16, weight="bold")).grid(row=0, column=0, columnspan=2, padx=10, pady=10)
        
        customtkinter.CTkLabel(add_frame, text="Exercise:").grid(row=1, column=0, padx=10, pady=5, sticky="e")
        self.ex_name_entry = customtkinter.CTkEntry(add_frame, placeholder_text="e.g., Running")
        self.ex_name_entry.grid(row=1, column=1, padx=10, pady=5)
        
        customtkinter.CTkLabel(add_frame, text="Duration (min):").grid(row=2, column=0, padx=10, pady=5, sticky="e")
        self.ex_duration_entry = customtkinter.CTkEntry(add_frame, placeholder_text="e.g., 30")
        self.ex_duration_entry.grid(row=2, column=1, padx=10, pady=5)
        
        vcmd = self.tab.register(self.validate_number)
        self.ex_duration_entry.configure(validate="key", validatecommand=(vcmd, '%P'))
        
        customtkinter.CTkLabel(add_frame, text="Calories Burned:").grid(row=3, column=0, padx=10, pady=5, sticky="e")
        self.ex_calories_entry = customtkinter.CTkEntry(add_frame, placeholder_text="e.g., 350 (optional)")
        self.ex_calories_entry.grid(row=3, column=1, padx=10, pady=5)
        self.ex_calories_entry.configure(validate="key", validatecommand=(vcmd, '%P'))
        
        self.add_exercise_button = customtkinter.CTkButton(add_frame, text="Add Exercise", command=self.add_exercise)
        self.add_exercise_button.grid(row=4, column=0, columnspan=2, padx=10, pady=20)
        
        self.exercise_log_frame = customtkinter.CTkScrollableFrame(self.tab, label_text=f"Exercise Log for {self.app.current_date}")
        self.exercise_log_frame.grid(row=0, column=1, rowspan=2, padx=10, pady=10, sticky="nsew")
        self.exercise_log_frame.grid_columnconfigure(0, weight=1)

    def validate_number(self, P):
        return P == "" or P.isdigit()

    def add_exercise(self):
        name = self.ex_name_entry.get()
        duration_str = self.ex_duration_entry.get()
        calories_str = self.ex_calories_entry.get()
        
        if not name or not duration_str:
            messagebox.showerror("Input Error", "Please provide an exercise name and duration.")
            return
            
        try:
            duration = float(duration_str)
            calories_burned = float(calories_str) if calories_str else duration * 7.5
        except ValueError:
            messagebox.showerror("Input Error", "Please enter valid numbers for duration and calories.")
            return
            
        date = self.app.current_date
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        self.app.db.save_exercise(date, timestamp, name, duration, calories_burned)
        self.app.refresh_data()
        
        self.ex_name_entry.delete(0, 'end')
        self.ex_duration_entry.delete(0, 'end')
        self.ex_calories_entry.delete(0, 'end')
        self.app.status_label.configure(text=f"Added exercise: {name}")

    def update_log_display(self):
        self.exercise_log_frame.configure(label_text=f"Exercise Log for {self.app.current_date}")
        for widget in self.exercise_log_frame.winfo_children():
            widget.destroy()
            
        exercises = self.app.db.get_exercises_by_date(self.app.current_date)
        if not exercises:
            customtkinter.CTkLabel(self.exercise_log_frame, text="No exercise logged for this day.").pack(pady=20)
            return
            
        for i, ex in enumerate(exercises):
            entry_frame = customtkinter.CTkFrame(self.exercise_log_frame)
            entry_frame.pack(fill="x", pady=5)
            
            details = f"{ex[2]} - {ex[3]}: {ex[4]:.0f} min, {ex[5]:.0f} kcal burned"
            customtkinter.CTkLabel(entry_frame, text=details, anchor="w").pack(padx=10, pady=5, fill="x")
            
            delete_btn = customtkinter.CTkButton(entry_frame, text="X", width=30, command=lambda id=ex[0]: self.delete_exercise(id))
            delete_btn.pack(side="right", padx=5)

    def delete_exercise(self, exercise_id):
        if messagebox.askyesno("Confirm Delete", "Are you sure you want to delete this exercise entry?"):
            self.app.db.delete_exercise(exercise_id)
            self.app.refresh_data()
