
import customtkinter
import threading

class MealPlannerTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=1)
        self.tab.grid_rowconfigure(1, weight=1)
        
        controls_frame = customtkinter.CTkFrame(self.tab)
        controls_frame.grid(row=0, column=0, sticky="ew", padx=10, pady=10)
        
        customtkinter.CTkLabel(controls_frame, text="Target Calories:").pack(side="left", padx=10)
        self.plan_cal_entry = customtkinter.CTkEntry(controls_frame, placeholder_text=str(int(self.app.target_calories)))
        self.plan_cal_entry.pack(side="left", padx=5)
        
        customtkinter.CTkLabel(controls_frame, text="Diet Type:").pack(side="left", padx=10)
        self.plan_diet_var = customtkinter.StringVar(value="Balanced")
        self.plan_diet_menu = customtkinter.CTkOptionMenu(controls_frame,
                                                          values=["Balanced", "High-Protein", "Low-Carb", "Vegetarian", "Vegan"],
                                                          variable=self.plan_diet_var)
        self.plan_diet_menu.pack(side="left", padx=5)
        
        self.generate_plan_btn = customtkinter.CTkButton(controls_frame, text="Generate Meal Plan", command=self.generate_meal_plan)
        self.generate_plan_btn.pack(side="left", padx=20)
        
        self.meal_plan_textbox = customtkinter.CTkTextbox(self.tab, state="disabled", wrap="word")
        self.meal_plan_textbox.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)
        
        self.plan_progress = customtkinter.CTkProgressBar(self.tab, mode="indeterminate")
        self.plan_progress.grid(row=2, column=0, padx=20, pady=10)

    def generate_meal_plan(self):
        cals = self.plan_cal_entry.get() or str(int(self.app.target_calories))
        diet = self.plan_diet_var.get()
        
        self.meal_plan_textbox.configure(state="normal")
        self.meal_plan_textbox.delete("1.0", "end")
        self.meal_plan_textbox.insert("1.0", "Generating your personalized meal plan...")
        self.meal_plan_textbox.configure(state="disabled")
        self.plan_progress.start()
        
        threading.Thread(target=self._generate_meal_plan_worker, args=(cals, diet), daemon=True).start()

    def _generate_meal_plan_worker(self, cals, diet):
        try:
            response_text = self.app.ai.generate_meal_plan(cals, diet, self.app.dietary_restrictions, self.app.food_preferences)
            self.app.after(0, self._update_meal_plan_box, response_text)
        except Exception as e:
            self.app.after(0, self._update_meal_plan_box, f"An error occurred: {e}")
        finally:
            self.app.after(0, self.plan_progress.stop)

    def _update_meal_plan_box(self, text):
        self.meal_plan_textbox.configure(state="normal")
        self.meal_plan_textbox.delete("1.0", "end")
        self.meal_plan_textbox.insert("1.0", text)
        self.meal_plan_textbox.configure(state="disabled")
